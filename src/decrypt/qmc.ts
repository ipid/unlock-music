import {QmcStaticCipher} from "./qmc_cipher";
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
import {DecryptQMCv2} from "./qmcv2";


import iconv from "iconv-lite";
import {DecryptResult} from "@/decrypt/entity";
import {queryAlbumCover} from "@/utils/api";

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

  if (version === 2) {
    const v2Decrypted = await DecryptQMCv2(fileBuffer);
    // 如果 v2 检测失败，降级到 v1 再尝试一次
    if (v2Decrypted) {
      musicDecoded = v2Decrypted;
    } else {
      version = 1;
    }
  }

  if (version === 1) {
    const seed = new QmcStaticCipher();
    musicDecoded = new Uint8Array(fileBuffer)
    seed.decrypt(musicDecoded, 0);
  } else if (!musicDecoded) {
    throw new Error(`解密失败: ${raw_ext}`);
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
