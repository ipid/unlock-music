const musicMetadata = require("music-metadata-browser");
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
const audio_mime_type = {
    mp3: "audio/mpeg",
    flac: "audio/flac",
    ogg: "audio/ogg"
};

async function Decrypt(file) {
    // 获取扩展名
    let filename_ext = file.name.substring(file.name.lastIndexOf(".") + 1, file.name.length).toLowerCase();
    let new_ext;
    switch (filename_ext) {
        case "qmc0":
        case "qmc3":
            new_ext = "mp3";
            break;
        case "qmcogg":
            new_ext = "ogg";
            break;
        case "qmcflac":
            new_ext = "flac";
            break;
        default:
            return {
                status: false,
                message: "File type is incorrect!",
            };
    }
    const mime = audio_mime_type[new_ext];
    // 读取文件
    const fileBuffer = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        reader.readAsArrayBuffer(file);
    });
    const audioData = new Uint8Array(fileBuffer);
    const audioDataLen = audioData.length;
    // 转换数据
    const seed = new Mask();
    for (let cur = 0; cur < audioDataLen; ++cur) {
        audioData[cur] ^= seed.NextMask();
    }
    // 导出
    const musicData = new Blob([audioData], {
        type: mime
    });
    const musicUrl = URL.createObjectURL(musicData);
    // 读取Meta
    let tag = await musicMetadata.parseBlob(musicData);

    // 处理无标题歌手
    let filename_array = file.name.substring(0, file.name.lastIndexOf(".")).split("-");
    let title = tag.common.title;
    let artist = tag.common.artist;
    if (filename_array.length > 1) {
        if (artist === undefined) artist = filename_array[0].trim();
        if (title === undefined) title = filename_array[1].trim();
    } else if (filename_array.length === 1) {
        if (title === undefined) title = filename_array[0].trim();
    }
    const filename = artist + " - " + title + "." + new_ext;
    // 处理无封面
    let pic_url = "";

    if (tag.common.picture !== undefined && tag.common.picture.length >= 1) {
        const picture = tag.common.picture[0];
        const blobPic = new Blob([picture.data], {type: picture.format});
        pic_url = URL.createObjectURL(blobPic);
    }
    // 返回
    return {
        status:true,
        filename: filename,
        title: title,
        artist: artist,
        album: tag.common.album,
        picture: pic_url,
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
