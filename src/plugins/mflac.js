const musicMetadata = require("music-metadata-browser");
export {Decrypt}

async function Decrypt(file) {
    // 获取扩展名
    let filename_ext = file.name.substring(file.name.lastIndexOf(".") + 1, file.name.length).toLowerCase();
    if (filename_ext !== "mflac") return {
        status: false,
        message: "File type is incorrect!",
    };
    // 读取文件
    const fileBuffer = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        reader.readAsArrayBuffer(file);
    });
    const audioData = new Uint8Array(fileBuffer.slice(0, -0x170));
    const audioDataLen = audioData.length;

    // 转换数据
    const seed = new Mask();
    if (!seed.DetectMask(audioData)) return{
        status: false,
        message: "此音乐无法解锁，目前mflac格式不提供完整支持",
    };
    for (let cur = 0; cur < audioDataLen; ++cur) {
        audioData[cur] ^= seed.NextMask();
    }
    // 导出
    const musicData = new Blob([audioData], {type: "audio/flac"});
    const musicUrl = URL.createObjectURL(musicData);
    console.log(musicUrl);

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
    const filename = artist + " - " + title + ".flac";
    // 处理无封面
    let pic_url = "";

    if (tag.common.picture !== undefined && tag.common.picture.length >= 1) {
        const picture = tag.common.picture[0];
        const blobPic = new Blob([picture.data], {type: picture.format});
        pic_url = URL.createObjectURL(blobPic);
    }
    // 返回*/
    return {
        status: true,
        message: "",
        filename: filename,
        title: title,
        artist: artist,
        album: tag.common.album,
        picture: pic_url,
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
            console.log(mask);
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
