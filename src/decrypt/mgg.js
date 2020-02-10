const musicMetadata = require("music-metadata-browser");
const util = require("./util");
export {Decrypt}
const FLAC_HEADER = [0x4F, 0x67, 0x67, 0x53, 0x00];

async function Decrypt(file, raw_filename, raw_ext) {
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
    let seed;
    try {
        let resp = await queryKeyInfo(keyData, headData, raw_filename);
        let data = await resp.json();
        seed = new Mask(data.Mask);

    } catch (e) {
        return {
            status: false,
            message: "此音乐无法解锁，目前mgg格式仅提供试验性支持",
        };
    }

    for (let cur = 0; cur < audioDataLen; ++cur) {
        audioData[cur] ^= seed.NextMask();
    }
    // 导出
    const musicData = new Blob([audioData], {type: "audio/ogg"});

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

class Mask {
    constructor(mask) {
        this.index = -1;
        this.mask_index = -1;
        this.mask128 = mask;
    }

    NextMask() {
        this.index++;
        this.mask_index++;
        if (this.index === 0x8000 || (this.index > 0x8000 && (this.index + 1) % 0x8000 === 0)) {
            this.index++;
            this.mask_index++;
        }
        if (this.mask_index >= 128) {
            this.mask_index -= 128;
        }
        return this.mask128[this.mask_index]
    }

}


function queryKeyInfo(keyData, headData, filename) {
    return fetch("https://stats.ixarea.com/collect/mgg/query", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({Key: Array.from(keyData), Head: Array.from(headData), Filename: filename}),
    })
}
