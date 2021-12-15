import {QmcMask, QmcMaskGetDefault} from "./qmcMask";
import {toByteArray as Base64Decode} from 'base64-js'
import {
    AudioMimeType,
    GetArrayBuffer,
    GetCoverFromFile,
    GetImageFromURL,
    GetMetaFromFile,
    SniffAudioExt, WriteMetaToFlac, WriteMetaToMp3
} from "@/decrypt/utils";
import {parseBlob as metaParseBlob} from "music-metadata-browser";
import {DecryptQMCv2} from "./qmcv2";


import iconv from "iconv-lite";
import {DecryptResult} from "@/decrypt/entity";
import {queryAlbumCover, queryKeyInfo, reportKeyUsage} from "@/utils/api";

interface Handler {
    ext: string
    version: number
}

export const HandlerMap: { [key: string]: Handler } = {
    "mgg": {ext: "ogg", version: 2},
    "mgg1": {ext: "ogg", version: 2},
    "mflac": {ext: "flac", version: 2},
    "mflac0": {ext: "flac", version: 2},

    "qmc0": {ext: "mp3", version: 1},
    "qmc2": {ext: "ogg", version: 1},
    "qmc3": {ext: "mp3", version: 1},
    "qmcogg": {ext: "ogg", version: 1},
    "qmcflac": {ext: "flac", version: 1},
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

    const fileBuffer = await GetArrayBuffer(file);
    let musicDecoded: Uint8Array;
    if (handler.version === 1) {
        const seed = QmcMaskGetDefault();
        musicDecoded = seed.Decrypt(new Uint8Array(fileBuffer));
    } else if (handler.version === 2) {
        musicDecoded = await DecryptQMCv2(fileBuffer);
    } else {
        throw new Error(`不支持的加密版本: ${handler.version} (${raw_ext})`);
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


async function queryKey(keyData: Uint8Array, filename: string, format: string): Promise<QmcMask | undefined> {
    try {
        const data = await queryKeyInfo(keyData, filename, format)
        return new QmcMask(Base64Decode(data.Matrix44));
    } catch (e) {
        console.warn(e);
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
