const musicMetadata = require("music-metadata-browser");
const util = require("./util");
export {Decrypt}


async function Decrypt(file, raw_filename, raw_ext) {
    const tag = await musicMetadata.parseBlob(file);
    const info = util.GetFileInfo(tag.common.artist, tag.common.title, raw_filename);
    return {
        status: true,
        title: info.title,
        artist: info.artist,
        ext: raw_ext,
        album: tag.common.album,
        picture: util.GetCoverURL(tag),
        file: URL.createObjectURL(file),
        mime: util.AudioMimeType[raw_ext]
    }
}
