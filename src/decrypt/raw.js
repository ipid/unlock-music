const musicMetadata = require("music-metadata-browser");
const util = require("./util");
export {Decrypt}


async function Decrypt(file, raw_filename, raw_ext) {
    let tag = await musicMetadata.parseBlob(file);

    let fileUrl = URL.createObjectURL(file);

    const picUrl = util.GetCoverURL(tag);
    const mime = util.AudioMimeType[raw_ext];
    const info = util.GetFileInfo(tag.common.artist, tag.common.title, raw_filename, raw_ext);

    return {
        status: true,
        filename: info.filename,
        title: info.title,
        artist: info.artist,
        ext: raw_ext,
        album: tag.common.album,
        picture: picUrl,
        file: fileUrl,
        mime: mime
    }
}
