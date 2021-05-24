import {Decrypt as RawDecrypt} from "@/decrypt/raw";
import {DecryptResult} from "@/decrypt/entity";
import {AudioMimeType, BytesHasPrefix, GetArrayBuffer, GetCoverFromFile, GetMetaFromFile} from "@/decrypt/utils.ts";

import {parseBlob as metaParseBlob} from "music-metadata-browser";

const MagicHeader = [0x69, 0x66, 0x6D, 0x74]
const MagicHeader2 = [0xfe, 0xfe, 0xfe, 0xfe]
const FileTypeMap: { [key: string]: string } = {
    " WAV": ".wav",
    "FLAC": ".flac",
    " MP3": ".mp3",
    " A4M": ".m4a",
}

export async function Decrypt(file: File, raw_filename: string, raw_ext: string): Promise<DecryptResult> {
    const oriData = new Uint8Array(await GetArrayBuffer(file));
    if (!BytesHasPrefix(oriData, MagicHeader) || !BytesHasPrefix(oriData.slice(8, 12), MagicHeader2)) {
        if (raw_ext === "xm") {
            throw Error("此xm文件已损坏")
        } else {
            return await RawDecrypt(file, raw_filename, raw_ext, true)
        }
    }

    let typeText = (new TextDecoder()).decode(oriData.slice(4, 8))
    if (!FileTypeMap.hasOwnProperty(typeText)) {
        throw Error("未知的.xm文件类型")
    }

    let key = oriData[0xf]
    let dataOffset = oriData[0xc] | oriData[0xd] << 8 | oriData[0xe] << 16
    let audioData = oriData.slice(0x10);
    let lenAudioData = audioData.length;
    for (let cur = dataOffset; cur < lenAudioData; ++cur)
        audioData[cur] = (audioData[cur] - key) ^ 0xff;

    const ext = FileTypeMap[typeText];
    const mime = AudioMimeType[ext];
    let musicBlob = new Blob([audioData], {type: mime});

    const musicMeta = await metaParseBlob(musicBlob);
    if (ext === "wav") {
        //todo:未知的编码方式
        console.info(musicMeta.common)
        musicMeta.common.album = "";
        musicMeta.common.artist = "";
        musicMeta.common.title = "";
    }
    const {title, artist} = GetMetaFromFile(raw_filename,
        musicMeta.common.title, musicMeta.common.artist,
        raw_filename.indexOf("_") === -1 ? "-" : "_")

    return {
        title,
        artist,
        ext,
        mime,
        album: musicMeta.common.album,
        picture: GetCoverFromFile(musicMeta),
        file: URL.createObjectURL(musicBlob),
        blob: musicBlob,
        rawExt: "xm"
    }
}

