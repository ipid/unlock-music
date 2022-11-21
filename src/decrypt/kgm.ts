import {
  AudioMimeType,
  BytesHasPrefix,
  GetArrayBuffer,
  GetCoverFromFile,
  GetMetaFromFile,
  SniffAudioExt,
} from '@/decrypt/utils';
import { parseBlob as metaParseBlob } from 'music-metadata-browser';
import { DecryptResult } from '@/decrypt/entity';
import { DecryptKgmWasm } from '@/decrypt/kgm_wasm';
import { decryptKgmByteAtOffsetV2, decryptVprByteAtOffset } from '@jixun/kugou-crypto/dist/utils/decryptionHelper';

//prettier-ignore
const VprHeader = [
  0x05, 0x28, 0xBC, 0x96, 0xE9, 0xE4, 0x5A, 0x43,
  0x91, 0xAA, 0xBD, 0xD0, 0x7A, 0xF5, 0x36, 0x31
]
//prettier-ignore
const KgmHeader = [
  0x7C, 0xD5, 0x32, 0xEB, 0x86, 0x02, 0x7F, 0x4B,
  0xA8, 0xAF, 0xA6, 0x8E, 0x0F, 0xFF, 0x99, 0x14
]

export async function Decrypt(file: File, raw_filename: string, raw_ext: string): Promise<DecryptResult> {
  const oriData = await GetArrayBuffer(file);
  if (raw_ext === 'vpr') {
    if (!BytesHasPrefix(new Uint8Array(oriData), VprHeader)) throw Error('Not a valid vpr file!');
  } else {
    if (!BytesHasPrefix(new Uint8Array(oriData), KgmHeader)) throw Error('Not a valid kgm(a) file!');
  }
  let musicDecoded: Uint8Array | undefined;
  if (globalThis.WebAssembly) {
    console.log('kgm: using wasm decoder');

    const kgmDecrypted = await DecryptKgmWasm(oriData, raw_ext);
    if (kgmDecrypted.success) {
      musicDecoded = kgmDecrypted.data;
      console.log('kgm wasm decoder suceeded');
    } else {
      console.warn('KgmWasm failed with error %s', kgmDecrypted.error || '(unknown error)');
    }
  }

  if (!musicDecoded) {
    musicDecoded = new Uint8Array(oriData);
    let bHeaderLen = new DataView(musicDecoded.slice(0x10, 0x14).buffer);
    let headerLen = bHeaderLen.getUint32(0, true);

    let key1 = Array.from(musicDecoded.slice(0x1c, 0x2c));
    key1.push(0);

    musicDecoded = musicDecoded.slice(headerLen);
    let dataLen = musicDecoded.length;

    const decryptByte = raw_ext === 'vpr' ? decryptVprByteAtOffset : decryptKgmByteAtOffsetV2;
    for (let i = 0; i < dataLen; i++) {
      musicDecoded[i] = decryptByte(musicDecoded[i], key1, i);
    }
  }

  const ext = SniffAudioExt(musicDecoded);
  const mime = AudioMimeType[ext];
  let musicBlob = new Blob([musicDecoded], { type: mime });
  const musicMeta = await metaParseBlob(musicBlob);
  const { title, artist } = GetMetaFromFile(raw_filename, musicMeta.common.title, String(musicMeta.common.artists || musicMeta.common.artist || ""));
  return {
    album: musicMeta.common.album,
    picture: GetCoverFromFile(musicMeta),
    file: URL.createObjectURL(musicBlob),
    blob: musicBlob,
    ext,
    mime,
    title,
    artist,
  };
}
