import {AudioMimeType, GetArrayBuffer, SniffAudioExt} from "@/decrypt/utils.ts";


import {parseBlob as metaParseBlob} from "music-metadata-browser";
import {GetMetaCoverURL, GetFileInfo} from "./util";

export async function Decrypt(file: Blob, raw_filename: string, raw_ext: string, detect: boolean = true) {
    let ext = raw_ext;
    if (detect) {
        const buffer = new Uint8Array(await GetArrayBuffer(file));
        ext = SniffAudioExt(buffer, raw_ext);
        if (ext !== raw_ext) file = new Blob([buffer], {type: AudioMimeType[ext]})
    }
    const tag = await metaParseBlob(file);
    const info = GetFileInfo(tag.common.artist, tag.common.title, raw_filename);
    return {
        status: true,
        title: info.title,
        artist: info.artist,
        ext: ext,
        album: tag.common.album,
        picture: GetMetaCoverURL(tag),
        file: URL.createObjectURL(file),
        mime: AudioMimeType[ext]
    }
}
