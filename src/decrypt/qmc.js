const musicMetadata = require("music-metadata-browser");
const util = require("./util");
import * as mask from "./qmcmask"

const OriginalExtMap = {
    "qmc0": "mp3",
    "qmc3": "mp3",
    "qmcogg": "ogg",
    "qmcflac": "flac",
    "bkcmp3": "mp3",
    "bkcflac": "flac",
    "tkm": "m4a"
};

//todo: use header to detect media type
export async function Decrypt(file, raw_filename, raw_ext) {
    // 获取扩展名
    if (!(raw_ext in OriginalExtMap)) {
        return {status: false, message: "File type is incorrect!"}
    }
    const new_ext = OriginalExtMap[raw_ext];
    const mime = util.AudioMimeType[new_ext];
    // 读取文件
    const fileBuffer = await util.GetArrayBuffer(file);
    const audioData = new Uint8Array(fileBuffer);
    // 转换数据
    const seed = mask.QmcMaskGetDefault();
    const dec = seed.Decrypt(audioData);
    // 导出
    const musicData = new Blob([dec], {type: mime});
    // 读取Meta
    const tag = await musicMetadata.parseBlob(musicData);
    const info = util.GetFileInfo(tag.common.artist, tag.common.title, raw_filename);

    // 返回
    return {
        status: true,
        title: info.title,
        artist: info.artist,
        ext: new_ext,
        album: tag.common.album,
        picture: util.GetCoverURL(tag),
        file: URL.createObjectURL(musicData),
        mime: mime
    }
}
