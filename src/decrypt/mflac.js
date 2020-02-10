const musicMetadata = require("music-metadata-browser");
import {GetArrayBuffer, GetCoverURL, GetFileInfo} from "./util"

import * as mask from "./qmcmask"

export async function Decrypt(file, raw_filename, raw_ext) {
    // 获取扩展名
    if (raw_ext !== "mflac") return {
        status: false,
        message: "File type is incorrect!",
    };
    // 读取文件
    const fileBuffer = await GetArrayBuffer(file);
    const audioData = new Uint8Array(fileBuffer.slice(0, -0x170));
    //const audioDataLen = audioData.length;

    // 转换数据
    const seed = mask.QmcMaskDetectMflac(audioData);
    if (seed === undefined) return {
        status: false,
        message: "此音乐无法解锁，目前mflac格式不提供完整支持",
    };
    const dec = seed.Decrypt(audioData);
    // 导出
    const musicData = new Blob([dec], {type: "audio/flac"});

    // 读取Meta
    let tag = await musicMetadata.parseBlob(musicData);
    const info = GetFileInfo(tag.common.artist, tag.common.title, raw_filename);
    //reportKeyInfo(new Uint8Array(fileBuffer.slice(-0x170)), seed.mask128,
    //    info.artist, info.title, tag.common.album, raw_filename);

    // 返回
    return {
        status: true,
        title: info.title,
        artist: info.artist,
        ext: 'flac',
        album: tag.common.album,
        picture: GetCoverURL(tag),
        file: URL.createObjectURL(musicData),
        mime: "audio/flac"
    }
}

function reportKeyInfo(keyData, maskData, artist, title, album, filename) {
    fetch("https://stats.ixarea.com/collect/mflac/mask", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            Mask: Array.from(maskData), Key: Array.from(keyData),
            Artist: artist, Title: title, Album: album, Filename: filename
        }),
    }).then().catch()
}
