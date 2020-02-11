const musicMetadata = require("music-metadata-browser");
import {GetCoverURL, GetFileInfo, AudioMimeType} from "./util";

export async function Decrypt(file, raw_filename, raw_ext) {
    const tag = await musicMetadata.parseBlob(file);
    const info = GetFileInfo(tag.common.artist, tag.common.title, raw_filename);
    return {
        status: true,
        title: info.title,
        artist: info.artist,
        ext: raw_ext,
        album: tag.common.album,
        picture: GetCoverURL(tag),
        file: URL.createObjectURL(file),
        mime: AudioMimeType[raw_ext]
    }
}
