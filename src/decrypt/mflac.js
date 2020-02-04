const musicMetadata = require("music-metadata-browser");
const util = require("./util");
export {Decrypt}

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
    const musicUrl = URL.createObjectURL(musicData);

    // 读取Meta
    let tag = await musicMetadata.parseBlob(musicData);
    const info = util.GetFileInfo(tag.common.artist, tag.common.title, raw_filename, "flac");
    let picUrl = util.GetCoverURL(tag);
    // 返回
    return {
        status: true,
        filename: info.filename,
        title: info.title,
        artist: info.artist,
        ext: 'flac',
        album: tag.common.album,
        picture: picUrl,
        file: musicUrl,
        mime: "audio/flac"
    }
}

class Mask {
    FLAC_HEADER = [0x66, 0x4C, 0x61, 0x43, 0x00];

    constructor() {
        this.index = -1;
        this.mask_index = -1;
        this.mask = Array(128).fill(0x00);
    }

    DetectMask(data) {

        let search_len = data.length - 256, mask;
        for (let block_idx = 0; block_idx < search_len; block_idx += 128) {
            let flag = true;
            mask = data.slice(block_idx, block_idx + 128);
            let next_mask = data.slice(block_idx + 128, block_idx + 256);
            for (let idx = 0; idx < 128; idx++) {
                if (mask[idx] !== next_mask[idx]) {
                    flag = false;
                    break;
                }
            }
            if (!flag) continue;


            for (let test_idx = 0; test_idx < this.FLAC_HEADER.length; test_idx++) {
                let p = data[test_idx] ^ mask[test_idx];
                if (p !== this.FLAC_HEADER[test_idx]) {
                    flag = false;
                    debugger;
                    break;
                }
            }
            if (!flag) continue;
            this.mask = mask;
            return true;
        }
        return false;
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
        return this.mask[this.mask_index]
    }

}
