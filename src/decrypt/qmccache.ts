import {
    AudioMimeType,
    GetArrayBuffer,
    GetCoverFromFile,
    GetMetaFromFile,
    SniffAudioExt,
    SplitFilename
} from "@/decrypt/utils.ts";

import {Decrypt as QmcDecrypt, HandlerMap} from "@/decrypt/qmc";

import {DecryptResult} from "@/decrypt/entity";

import {parseBlob as metaParseBlob} from "music-metadata-browser";

export async function Decrypt(file: Blob, raw_filename: string, _: string)
    : Promise<DecryptResult> {
    const buffer = new Uint8Array(await GetArrayBuffer(file));
    let length = buffer.length
    for (let i = 0; i < length; i++) {
        buffer[i] ^= 0xf4
        if (buffer[i] <= 0x3f) buffer[i] = buffer[i] * 4;
        else if (buffer[i] <= 0x7f) buffer[i] = (buffer[i] - 0x40) * 4 + 1;
        else if (buffer[i] <= 0xbf) buffer[i] = (buffer[i] - 0x80) * 4 + 2;
        else buffer[i] = (buffer[i] - 0xc0) * 4 + 3;
    }
    let ext = SniffAudioExt(buffer, "");
    const newName = SplitFilename(raw_filename)
    let audioBlob: Blob
    if (ext !== "" || newName.ext === "mp3") {
        audioBlob = new Blob([buffer], {type: AudioMimeType[ext]})
    } else if (newName.ext in HandlerMap) {
        audioBlob = new Blob([buffer], {type: "application/octet-stream"})
        return QmcDecrypt(audioBlob, newName.name, newName.ext);
    } else {
        throw "不支持的QQ音乐缓存格式"
    }
    const tag = await metaParseBlob(audioBlob);
    const {title, artist} = GetMetaFromFile(raw_filename, tag.common.title, tag.common.artist)

    return {
        title,
        artist,
        ext,
        album: tag.common.album,
        picture: GetCoverFromFile(tag),
        file: URL.createObjectURL(audioBlob),
        blob: audioBlob,
        mime: AudioMimeType[ext]
    }
}
