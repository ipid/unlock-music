import {GetFileInfo, GetMetaCoverURL} from "./util";
import {AudioMimeType, BytesHasPrefix, GetArrayBuffer, SniffAudioExt} from "@/decrypt/utils.ts";
import {Decrypt as RawDecrypt} from "@/decrypt/raw.ts";

import {parseBlob as metaParseBlob} from "music-metadata-browser";

const MagicHeader = [
    0x79, 0x65, 0x65, 0x6C, 0x69, 0x6F, 0x6E, 0x2D,
    0x6B, 0x75, 0x77, 0x6F, 0x2D, 0x74, 0x6D, 0x65,
]
const PreDefinedKey = "MoOtOiTvINGwd2E6n0E1i7L5t2IoOoNk"

export async function Decrypt(file: File, raw_filename: string, _: string) {
    const oriData = new Uint8Array(await GetArrayBuffer(file));
    if (!BytesHasPrefix(oriData, MagicHeader)) {
        if (SniffAudioExt(oriData) === "aac") {
            return await RawDecrypt(file, raw_filename, "aac", true)
        }
        return {status: false, message: "Not a valid kwm file!"}
    }

    let fileKey = oriData.slice(0x18, 0x20)
    let mask = createMaskFromKey(fileKey)
    let audioData = oriData.slice(0x400);
    let lenAudioData = audioData.length;
    for (let cur = 0; cur < lenAudioData; ++cur)
        audioData[cur] ^= mask[cur % 0x20];


    const ext = SniffAudioExt(audioData);
    const mime = AudioMimeType[ext];
    let musicBlob = new Blob([audioData], {type: mime});

    const musicMeta = await metaParseBlob(musicBlob);
    const info = GetFileInfo(musicMeta.common.artist, musicMeta.common.title, raw_filename);

    const imgUrl = GetMetaCoverURL(musicMeta);

    return {
        status: true,
        title: info.title,
        artist: info.artist,
        ext: ext,
        album: musicMeta.common.album,
        picture: imgUrl,
        file: URL.createObjectURL(musicBlob),
        mime: mime
    }
}


function createMaskFromKey(keyBytes: Uint8Array): Uint8Array {
    let keyView = new DataView(keyBytes.buffer)
    let keyStr = keyView.getBigUint64(0, true).toString()
    let keyStrTrim = trimKey(keyStr)
    let key = new Uint8Array(32)
    for (let i = 0; i < 32; i++) {
        key[i] = PreDefinedKey.charCodeAt(i) ^ keyStrTrim.charCodeAt(i)
    }
    return key
}


function trimKey(keyRaw: string): string {
    let lenRaw = keyRaw.length;
    let out = keyRaw;
    if (lenRaw > 32) {
        out = keyRaw.slice(0, 32)
    } else if (lenRaw < 32) {
        out = keyRaw.padEnd(32, keyRaw)
    }
    return out
}
