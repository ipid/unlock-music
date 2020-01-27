const musicMetadata = require("music-metadata-browser");
const util = require("./util");
export {Decrypt}
const SEED_MAP = [
    [0x4a, 0xd6, 0xca, 0x90, 0x67, 0xf7, 0x52],
    [0x5e, 0x95, 0x23, 0x9f, 0x13, 0x11, 0x7e],
    [0x47, 0x74, 0x3d, 0x90, 0xaa, 0x3f, 0x51],
    [0xc6, 0x09, 0xd5, 0x9f, 0xfa, 0x66, 0xf9],
    [0xf3, 0xd6, 0xa1, 0x90, 0xa0, 0xf7, 0xf0],
    [0x1d, 0x95, 0xde, 0x9f, 0x84, 0x11, 0xf4],
    [0x0e, 0x74, 0xbb, 0x90, 0xbc, 0x3f, 0x92],
    [0x00, 0x09, 0x5b, 0x9f, 0x62, 0x66, 0xa1]];

const OriginalExtMap = {
    "qmc0": "mp3",
    "qmc3": "mp3",
    "qmcogg": "ogg",
    "qmcflac": "flac",
    "bkcmp3": "mp3",
    "bkcflac": "flac"
};

async function Decrypt(file, raw_filename, raw_ext) {
    // 获取扩展名
    if (!(raw_ext in OriginalExtMap)) {
        return {status: false, message: "File type is incorrect!"}
    }
    let new_ext = OriginalExtMap[raw_ext]
    const mime = util.AudioMimeType[new_ext];
    // 读取文件
    const fileBuffer = await util.GetArrayBuffer(file);
    const audioData = new Uint8Array(fileBuffer);
    // 转换数据
    const seed = new Mask();
    for (let cur = 0; cur < audioData.length; ++cur) {
        audioData[cur] ^= seed.NextMask();
    }
    // 导出
    const musicData = new Blob([audioData], {type: mime});
    const musicUrl = URL.createObjectURL(musicData);
    // 读取Meta
    let tag = await musicMetadata.parseBlob(musicData);
    const info = util.GetFileInfo(tag.common.artist, tag.common.title, raw_filename, new_ext);
    let picUrl = util.GetCoverURL(tag);

    // 返回
    return {
        status: true,
        filename: info.filename,
        title: info.title,
        artist: info.artist,
        album: tag.common.album,
        picture: picUrl,
        file: musicUrl,
        mime: mime
    }
}

class Mask {
    constructor() {
        this.x = -1;
        this.y = 8;
        this.dx = 1;
        this.index = -1;
    }

    NextMask() {
        let ret;
        this.index++;
        if (this.x < 0) {
            this.dx = 1;
            this.y = (8 - this.y) % 8;
            ret = 0xc3
        } else if (this.x > 6) {
            this.dx = -1;
            this.y = 7 - this.y;
            ret = 0xd8
        } else {
            ret = SEED_MAP[this.y][this.x]
        }
        this.x += this.dx;
        if (this.index === 0x8000 || (this.index > 0x8000 && (this.index + 1) % 0x8000 === 0)) {
            return this.NextMask()
        }
        return ret
    }

}
