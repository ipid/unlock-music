const musicMetadata = require("music-metadata-browser");
const util = require("./util");
export {Decrypt}
const FLAC_HEADER = [0x66, 0x4C, 0x61, 0x43, 0x00];

async function Decrypt(file, raw_filename, raw_ext) {
    // 获取扩展名
    if (raw_ext !== "mflac") return {
        status: false,
        message: "File type is incorrect!",
    };
    // 读取文件
    const fileBuffer = await util.GetArrayBuffer(file);
    const audioData = new Uint8Array(fileBuffer.slice(0, -0x170));
    const audioDataLen = audioData.length;

    // 转换数据
    const seed = new Mask();
    if (!seed.DetectMask(audioData)) return {
        status: false,
        message: "此音乐无法解锁，目前mflac格式不提供完整支持",
    };
    for (let cur = 0; cur < audioDataLen; ++cur) {
        audioData[cur] ^= seed.NextMask();
    }
    // 导出
    const musicData = new Blob([audioData], {type: "audio/flac"});

    // 读取Meta
    let tag = await musicMetadata.parseBlob(musicData);
    const info = util.GetFileInfo(tag.common.artist, tag.common.title, raw_filename);
    reportKeyInfo(new Uint8Array(fileBuffer.slice(-0x170)), seed.mask128,
        info.artist, info.title, tag.common.album, raw_filename);

    // 返回
    return {
        status: true,
        title: info.title,
        artist: info.artist,
        ext: 'flac',
        album: tag.common.album,
        picture: util.GetCoverURL(tag),
        file: URL.createObjectURL(musicData),
        mime: "audio/flac"
    }
}

class Mask {


    constructor() {
        this.index = -1;
        this.mask_index = -1;
        this.mask128 = new Uint8Array(128);
        this.mask58_martix = new Uint8Array(56);
        this.mask58_super1 = 0x00;
        this.mask58_super2 = 0x00;
    }

    DetectMask(data) {
        let search_len = Math.min(0x8000, data.length), mask;
        for (let block_idx = 0; block_idx < search_len; block_idx += 128) {
            mask = data.slice(block_idx, block_idx + 128);
            const mask58 = this.Convert128to58(mask);
            if (mask58 === undefined) continue;

            if (!FLAC_HEADER.every((val, idx) => {
                return val === mask[idx] ^ data[idx];
            })) continue;

            this.mask128 = mask;
            this.mask58_martix = mask58.matrix;
            this.mask58_super1 = mask58.super_8_1;
            this.mask58_super2 = mask58.super_8_2;
            return true;
        }
        return false;
    }

    Convert128to58(mask128) {
        const super_8_1 = mask128[0], super_8_2 = mask128[8];
        let matrix = [];
        for (let row_idx = 0; row_idx < 8; row_idx++) {
            const len_start = 16 * row_idx;
            const len_right_start = 120 - len_start;//16*(8-row_idx-1)+8

            if (mask128[len_start] !== super_8_1 || mask128[len_start + 8] !== super_8_2) {
                return
            }

            const row_left = mask128.slice(len_start + 1, len_start + 8);
            const row_right = mask128.slice(len_right_start + 1, len_right_start + 8).reverse();
            if (row_left.every((val, idx) => {
                return row_right[idx] === val
            })) {
                matrix.push(row_left);
            } else {
                return
            }
        }
        return {matrix, super_8_1, super_8_2}
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
