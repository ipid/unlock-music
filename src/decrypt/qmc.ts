import { QmcMapCipher, QmcRC4Cipher, QmcStaticCipher, QmcStreamCipher } from './qmc_cipher';
import { AudioMimeType, GetArrayBuffer, SniffAudioExt } from '@/decrypt/utils';

import { DecryptResult } from '@/decrypt/entity';
import { QmcDeriveKey } from '@/decrypt/qmc_key';
import { DecryptQMCWasm } from '@/decrypt/qmc_wasm';
import { extractQQMusicMeta } from '@/utils/qm_meta';

interface Handler {
  ext: string;
  version: number;
}

export const HandlerMap: { [key: string]: Handler } = {
  mgg: { ext: 'ogg', version: 2 },
  mgg0: { ext: 'ogg', version: 2 },
  mggl: { ext: 'ogg', version: 2 },
  mgg1: { ext: 'ogg', version: 2 },
  mflac: { ext: 'flac', version: 2 },
  mflac0: { ext: 'flac', version: 2 },

  // qmcflac / qmcogg:
  // 有可能是 v2 加密但混用同一个后缀名。
  qmcflac: { ext: 'flac', version: 2 },
  qmcogg: { ext: 'ogg', version: 2 },

  qmc0: { ext: 'mp3', version: 1 },
  qmc2: { ext: 'ogg', version: 1 },
  qmc3: { ext: 'mp3', version: 1 },
  bkcmp3: { ext: 'mp3', version: 1 },
  bkcflac: { ext: 'flac', version: 1 },
  tkm: { ext: 'm4a', version: 1 },
  '666c6163': { ext: 'flac', version: 1 },
  '6d7033': { ext: 'mp3', version: 1 },
  '6f6767': { ext: 'ogg', version: 1 },
  '6d3461': { ext: 'm4a', version: 1 },
  '776176': { ext: 'wav', version: 1 },
};

export async function Decrypt(file: Blob, raw_filename: string, raw_ext: string): Promise<DecryptResult> {
  if (!(raw_ext in HandlerMap)) throw `Qmc cannot handle type: ${raw_ext}`;
  const handler = HandlerMap[raw_ext];
  let { version } = handler;

  const fileBuffer = await GetArrayBuffer(file);
  let musicDecoded: Uint8Array | undefined;
  let musicID: number | string | undefined;

  if (version === 2 && globalThis.WebAssembly) {
    console.log('qmc: using wasm decoder');

    const v2Decrypted = await DecryptQMCWasm(fileBuffer);
    // 若 v2 检测失败，降级到 v1 再尝试一次
    if (v2Decrypted.success) {
      musicDecoded = v2Decrypted.data;
      musicID = v2Decrypted.songId;
    } else {
      console.warn('qmc2-wasm failed with error %s', v2Decrypted.error || '(no error)');
    }
  }

  if (!musicDecoded) {
    // may throw error
    console.log('qmc: using js decoder');
    const d = new QmcDecoder(new Uint8Array(fileBuffer));
    musicDecoded = d.decrypt();
    musicID = d.songID;
  }

  const ext = SniffAudioExt(musicDecoded, handler.ext);
  const mime = AudioMimeType[ext];

  const { album, artist, imgUrl, blob, title } = await extractQQMusicMeta(
    new Blob([musicDecoded], { type: mime }),
    raw_filename,
    ext,
    musicID,
  );

  return {
    title: title,
    artist: artist,
    ext: ext,
    album: album,
    picture: imgUrl,
    file: URL.createObjectURL(blob),
    blob: blob,
    mime: mime,
  };
}

export class QmcDecoder {
  private static readonly BYTE_COMMA = ','.charCodeAt(0);
  private readonly file: Uint8Array;
  private readonly size: number;
  private decoded: boolean = false;
  private audioSize?: number;
  private cipher?: QmcStreamCipher;

  public constructor(file: Uint8Array) {
    this.file = file;
    this.size = file.length;
    this.searchKey();
  }

  private _songID?: number;

  public get songID() {
    return this._songID;
  }

  public decrypt(): Uint8Array {
    if (!this.cipher) {
      throw new Error('no cipher found');
    }
    if (!this.audioSize || this.audioSize <= 0) {
      throw new Error('invalid audio size');
    }
    const audioBuf = this.file.subarray(0, this.audioSize);

    if (!this.decoded) {
      this.cipher.decrypt(audioBuf, 0);
      this.decoded = true;
    }

    return audioBuf;
  }

  private searchKey() {
    const last4Byte = this.file.slice(-4);
    const textEnc = new TextDecoder();
    if (textEnc.decode(last4Byte) === 'QTag') {
      const sizeBuf = this.file.slice(-8, -4);
      const sizeView = new DataView(sizeBuf.buffer, sizeBuf.byteOffset);
      const keySize = sizeView.getUint32(0, false);
      this.audioSize = this.size - keySize - 8;

      const rawKey = this.file.subarray(this.audioSize, this.size - 8);
      const keyEnd = rawKey.findIndex((v) => v == QmcDecoder.BYTE_COMMA);
      if (keyEnd < 0) {
        throw new Error('invalid key: search raw key failed');
      }
      this.setCipher(rawKey.subarray(0, keyEnd));

      const idBuf = rawKey.subarray(keyEnd + 1);
      const idEnd = idBuf.findIndex((v) => v == QmcDecoder.BYTE_COMMA);
      if (keyEnd < 0) {
        throw new Error('invalid key: search song id failed');
      }
      this._songID = parseInt(textEnc.decode(idBuf.subarray(0, idEnd)), 10);
    } else {
      const sizeView = new DataView(last4Byte.buffer, last4Byte.byteOffset);
      const keySize = sizeView.getUint32(0, true);
      if (keySize < 0x300) {
        this.audioSize = this.size - keySize - 4;
        const rawKey = this.file.subarray(this.audioSize, this.size - 4);
        this.setCipher(rawKey);
      } else {
        this.audioSize = this.size;
        this.cipher = new QmcStaticCipher();
      }
    }
  }

  private setCipher(keyRaw: Uint8Array) {
    const keyDec = QmcDeriveKey(keyRaw);
    if (keyDec.length > 300) {
      this.cipher = new QmcRC4Cipher(keyDec);
    } else {
      this.cipher = new QmcMapCipher(keyDec);
    }
  }
}
