import {QmcMapCipher, QmcRC4Cipher, QmcStaticCipher, QmcStreamCipher} from "./qmc_cipher";
import {
  AudioMimeType,
  GetArrayBuffer,
  GetCoverFromFile,
  GetImageFromURL,
  GetMetaFromFile,
  SniffAudioExt,
  WriteMetaToFlac,
  WriteMetaToMp3
} from "@/decrypt/utils";
import {parseBlob as metaParseBlob} from "music-metadata-browser";
import {DecryptQMCWasm} from "./qmc_wasm";


import iconv from "iconv-lite";
import {DecryptResult} from "@/decrypt/entity";
import {queryAlbumCover} from "@/utils/api";
import {QmcDeriveKey} from "@/decrypt/qmc_key";

interface Handler {
  ext: string
  version: number
}

export const HandlerMap: { [key: string]: Handler } = {
  "mgg": {ext: "ogg", version: 2},
  "mgg1": {ext: "ogg", version: 2},
  "mflac": {ext: "flac", version: 2},
  "mflac0": {ext: "flac", version: 2},

  // qmcflac / qmcogg:
  // 有可能是 v2 加密但混用同一个后缀名。
  "qmcflac": {ext: "flac", version: 2},
  "qmcogg": {ext: "ogg", version: 2},

  "qmc0": {ext: "mp3", version: 1},
  "qmc2": {ext: "ogg", version: 1},
  "qmc3": {ext: "mp3", version: 1},
  "bkcmp3": {ext: "mp3", version: 1},
  "bkcflac": {ext: "flac", version: 1},
  "tkm": {ext: "m4a", version: 1},
  "666c6163": {ext: "flac", version: 1},
  "6d7033": {ext: "mp3", version: 1},
  "6f6767": {ext: "ogg", version: 1},
  "6d3461": {ext: "m4a", version: 1},
  "776176": {ext: "wav", version: 1}
};

export async function Decrypt(file: Blob, raw_filename: string, raw_ext: string): Promise<DecryptResult> {
  if (!(raw_ext in HandlerMap)) throw `Qmc cannot handle type: ${raw_ext}`;
  const handler = HandlerMap[raw_ext];
  let {version} = handler;

  const fileBuffer = await GetArrayBuffer(file);
  let musicDecoded: Uint8Array | undefined;

  if (version === 2 && globalThis.WebAssembly) {
    console.log("qmc: using wasm decoder")
    const v2Decrypted = await DecryptQMCWasm(fileBuffer);
    // 如果 v2 检测失败，降级到 v1 再尝试一次
    if (v2Decrypted) {
      musicDecoded = v2Decrypted;
    }
  }
  if (!musicDecoded) {
    // may throw error
    console.log("qmc: using js decoder")
    const d = new QmcDecoder(new Uint8Array(fileBuffer))
    musicDecoded = d.decrypt()
  }

  const ext = SniffAudioExt(musicDecoded, handler.ext);
  const mime = AudioMimeType[ext];

  let musicBlob = new Blob([musicDecoded], {type: mime});

  const musicMeta = await metaParseBlob(musicBlob);
  for (let metaIdx in musicMeta.native) {
    if (!musicMeta.native.hasOwnProperty(metaIdx)) continue
    if (musicMeta.native[metaIdx].some(item => item.id === "TCON" && item.value === "(12)")) {
      console.warn("try using gbk encoding to decode meta")
      musicMeta.common.artist = iconv.decode(new Buffer(musicMeta.common.artist ?? ""), "gbk");
      musicMeta.common.title = iconv.decode(new Buffer(musicMeta.common.title ?? ""), "gbk");
      musicMeta.common.album = iconv.decode(new Buffer(musicMeta.common.album ?? ""), "gbk");
    }
  }

  const info = GetMetaFromFile(raw_filename, musicMeta.common.title, musicMeta.common.artist)

  let imgUrl = GetCoverFromFile(musicMeta);
  if (!imgUrl) {
    imgUrl = await getCoverImage(info.title, info.artist, musicMeta.common.album);
    if (imgUrl) {
      const imageInfo = await GetImageFromURL(imgUrl);
      if (imageInfo) {
        imgUrl = imageInfo.url
        try {
          const newMeta = {picture: imageInfo.buffer, title: info.title, artists: info.artist?.split(" _ ")}
          if (ext === "mp3") {
            musicDecoded = WriteMetaToMp3(Buffer.from(musicDecoded), newMeta, musicMeta)
            musicBlob = new Blob([musicDecoded], {type: mime});
          } else if (ext === 'flac') {
            musicDecoded = WriteMetaToFlac(Buffer.from(musicDecoded), newMeta, musicMeta)
            musicBlob = new Blob([musicDecoded], {type: mime});
          } else {
            console.info("writing metadata for " + ext + " is not being supported for now")
          }
        } catch (e) {
          console.warn("Error while appending cover image to file " + e)
        }
      }
    }
  }
  return {
    title: info.title,
    artist: info.artist,
    ext: ext,
    album: musicMeta.common.album,
    picture: imgUrl,
    file: URL.createObjectURL(musicBlob),
    blob: musicBlob,
    mime: mime
  }
}


async function getCoverImage(title: string, artist?: string, album?: string): Promise<string> {
  const song_query_url = "https://stats.ixarea.com/apis" + "/music/qq-cover"
  try {
    const data = await queryAlbumCover(title, artist, album)
    return `${song_query_url}/${data.Type}/${data.Id}`
  } catch (e) {
    console.warn(e);
  }
  return ""
}

export class QmcDecoder {
  file: Uint8Array
  size: number
  decoded: boolean = false
  audioSize?: number
  private static readonly BYTE_COMMA = ','.charCodeAt(0)
  cipher?: QmcStreamCipher

  constructor(file: Uint8Array) {
    this.file = file
    this.size = file.length
    this.searchKey()
  }

  decrypt(): Uint8Array {
    if (!this.cipher) {
      throw new Error("no cipher found")
    }
    if (!this.audioSize || this.audioSize <= 0) {
      throw new Error("invalid audio size")
    }
    const audioBuf = this.file.subarray(0, this.audioSize)

    if (!this.decoded) {
      this.cipher.decrypt(audioBuf, 0)
      this.decoded = true
    }

    return audioBuf
  }

  private searchKey() {
    const last4Byte = this.file.slice(-4);
    const textEnc = new TextDecoder()
    if (textEnc.decode(last4Byte) === 'QTag') {
      const sizeBuf = this.file.slice(-8, -4)
      const sizeView = new DataView(sizeBuf.buffer, sizeBuf.byteOffset)
      const keySize = sizeView.getUint32(0, false)
      this.audioSize = this.size - keySize - 8
      const rawKey = this.file.subarray(this.audioSize, this.size - 8)
      const keyEnd = rawKey.findIndex(v => v == QmcDecoder.BYTE_COMMA)
      const keyDec = QmcDeriveKey(rawKey.subarray(0, keyEnd))
      this.cipher = new QmcRC4Cipher(keyDec)
    } else {
      const sizeView = new DataView(last4Byte.buffer, last4Byte.byteOffset);
      const keySize = sizeView.getUint32(0, true)
      if (keySize < 0x300) {
        this.audioSize = this.size - keySize - 4
        const rawKey = this.file.subarray(this.audioSize, this.size - 4)
        const keyDec = QmcDeriveKey(rawKey)
        this.cipher = new QmcMapCipher(keyDec)
      } else {
        this.audioSize = this.size
        this.cipher = new QmcStaticCipher()
      }
    }
  }


}
