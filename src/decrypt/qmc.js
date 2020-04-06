import {AudioMimeType, DetectAudioExt, GetArrayBuffer, GetFileInfo, GetMetaCoverURL, RequestJsonp} from "./util";
import {QmcMaskCreate58, QmcMaskDetectMflac, QmcMaskDetectMgg, QmcMaskGetDefault} from "./qmcMask";

import {decode} from "iconv-lite"

const musicMetadata = require("music-metadata-browser");

const HandlerMap = {
    "mgg": {handler: QmcMaskDetectMgg, ext: "ogg", detect: true},
    "mflac": {handler: QmcMaskDetectMflac, ext: "flac", detect: true},
    "qmc0": {handler: QmcMaskGetDefault, ext: "mp3", detect: false},
    "qmc2": {handler: QmcMaskGetDefault, ext: "ogg", detect: false},
    "qmc3": {handler: QmcMaskGetDefault, ext: "mp3", detect: false},
    "qmcogg": {handler: QmcMaskGetDefault, ext: "ogg", detect: false},
    "qmcflac": {handler: QmcMaskGetDefault, ext: "flac", detect: false},
    "bkcmp3": {handler: QmcMaskGetDefault, ext: "mp3", detect: false},
    "bkcflac": {handler: QmcMaskGetDefault, ext: "flac", detect: false},
    "tkm": {handler: QmcMaskGetDefault, ext: "m4a", detect: false}
};

export async function Decrypt(file, raw_filename, raw_ext) {
    if (!(raw_ext in HandlerMap)) return {status: false, message: "File type is incorrect!"};
    const handler = HandlerMap[raw_ext];

    const fileData = new Uint8Array(await GetArrayBuffer(file));
    let audioData, seed, keyData;
    if (handler.detect) {
        audioData = fileData.slice(0, -0x170);
        seed = handler.handler(audioData);
        keyData = fileData.slice(-0x170);
        if (seed === undefined) seed = await queryKeyInfo(keyData, raw_filename, raw_ext);
        if (seed === undefined) return {status: false, message: raw_ext + "格式仅提供实验性支持！"};
    } else {
        audioData = fileData;
        seed = handler.handler(audioData);
    }
    let musicDecoded = seed.Decrypt(audioData);

    const ext = DetectAudioExt(musicDecoded, handler.ext);
    const mime = AudioMimeType[ext];

    let musicBlob = new Blob([musicDecoded], {type: mime});

    const musicMeta = await musicMetadata.parseBlob(musicBlob);
    for (let metaIdx in musicMeta.native) {
        if (musicMeta.native[metaIdx].some(item => item.id === "TCON" && item.value === "(12)")) {
            musicMeta.common.artist = decode(musicMeta.common.artist, "gbk");
            musicMeta.common.title = decode(musicMeta.common.title, "gbk");
            musicMeta.common.album = decode(musicMeta.common.album, "gbk");
        }
    }

    //todo: Use artists list to replace artist
    const info = GetFileInfo(musicMeta.common.artist, musicMeta.common.title, raw_filename);
    if (handler.detect) reportKeyUsage(keyData, seed.Matrix128,
        info.artist, info.title, musicMeta.common.album, raw_filename, raw_ext);

    let imgUrl = GetMetaCoverURL(musicMeta);
    if (imgUrl === "") {
        imgUrl = await queryAlbumCoverImage(info.artist, info.title, musicMeta.common.album);
        //todo: 解决跨域获取图像的问题
    }
    return {
        status: true,
        title: info.title,
        artist: info.artist,
        ext: ext,
        album: musicMeta.common.album,
        picture: imgUrl,
        file: URL.createObjectURL(musicBlob),
        mime: mime
    }
}

function reportKeyUsage(keyData, maskData, artist, title, album, filename, format) {
    fetch("https://stats.ixarea.com/collect/qmcmask/usage", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            Mask: Array.from(maskData), Key: Array.from(keyData),
            Artist: artist, Title: title, Album: album, Filename: filename, Format: format
        }),
    }).then().catch()
}

async function queryKeyInfo(keyData, filename, format) {
    try {
        const resp = await fetch("https://stats.ixarea.com/collect/qmcmask/query", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({Format: format, Key: Array.from(keyData), Filename: filename}),
        });
        let data = await resp.json();
        return QmcMaskCreate58(data.Matrix58, data.Super58A, data.Super58B);
    } catch (e) {
    }
}

async function queryAlbumCoverImage(artist, title, album) {
    let song_query_url = "https://c.y.qq.com/soso/fcgi-bin/client_search_cp?n=10&new_json=1&w=" +
        encodeURIComponent(artist + " " + title + " " + album);
    let jsonpData;
    let queriedSong = undefined;
    try {
        jsonpData = await RequestJsonp(song_query_url, "callback");
        queriedSong = jsonpData["data"]["song"]["list"][0];
    } catch (e) {
        console.error(e)
    }
    console.log(queriedSong);
    let imgUrl = "";
    if (undefined !== queriedSong && undefined !== queriedSong["album"]) {
        if (queriedSong["album"]["pmid"] !== undefined) {
            imgUrl = "https://y.gtimg.cn/music/photo_new/T002M000" + queriedSong["album"]["pmid"] + ".jpg"
        } else if (queriedSong["album"]["id"] !== undefined) {
            imgUrl = "https://imgcache.qq.com/music/photo/album/" +
                queriedSong["album"]["id"] % 100 +
                "/albumpic_" + queriedSong["album"]["id"] + "_0.jpg"
        }
    }
    return imgUrl;
}