const musicMetadata = require("music-metadata-browser");
const util = require("./util");

import * as mask from "./qmcmask"

//todo: combine qmc mflac mgg
export async function Decrypt(file, raw_filename, raw_ext) {
    // 获取扩展名
    if (raw_ext !== "mgg") return {
        status: false,
        message: "File type is incorrect!",
    };
    // 读取文件
    const fileBuffer = await util.GetArrayBuffer(file);
    const audioData = new Uint8Array(fileBuffer.slice(0, -0x170));
    const audioDataLen = audioData.length;
    const keyData = new Uint8Array(fileBuffer.slice(-0x170));
    const headData = new Uint8Array(fileBuffer.slice(0, 170));
    let seed = mask.QmcMaskDetectMgg(headData);
    if (seed === undefined) {
        return {
            status: false,
            message: "此音乐无法解锁，目前mgg格式仅提供试验性支持",
        };
        /*try {
            let resp = await queryKeyInfo(keyData, headData, raw_filename);
            let data = await resp.json();
            seed = mask.QmcMaskCreate128(data.Mask);
        } catch (e) {}*/
    }
    const dec = seed.Decrypt(audioData);
    // 导出
    const musicData = new Blob([dec], {type: "audio/ogg"});

    // 读取Meta
    let tag = await musicMetadata.parseBlob(musicData);
    const info = util.GetFileInfo(tag.common.artist, tag.common.title, raw_filename);

    // 返回
    return {
        status: true,
        title: info.title,
        artist: info.artist,
        ext: 'ogg',
        album: tag.common.album,
        picture: util.GetCoverURL(tag),
        file: URL.createObjectURL(musicData),
        mime: "audio/ogg"
    }

}


function queryKeyInfo(keyData, headData, filename) {
    return fetch("http://127.0.0.1:6580/mgg/query", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({Key: Array.from(keyData), Head: Array.from(headData), Filename: filename}),
    })
}
