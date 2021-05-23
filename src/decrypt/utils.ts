export const FLAC_HEADER = [0x66, 0x4C, 0x61, 0x43];
export const MP3_HEADER = [0x49, 0x44, 0x33];
export const OGG_HEADER = [0x4F, 0x67, 0x67, 0x53];
export const M4A_HEADER = [0x66, 0x74, 0x79, 0x70];
export const WMA_HEADER = [
    0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
    0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C,
]
export const WAV_HEADER = [0x52, 0x49, 0x46, 0x46]
export const AAC_HEADER = [0xFF, 0xF1]

export function BytesHasPrefix(data: Uint8Array, prefix: number[]): boolean {
    if (prefix.length > data.length) return false
    return prefix.every((val, idx) => {
        return val === data[idx];
    })
}

export function BytesEquals(data: Uint8Array, another: Uint8Array): boolean {
    if (another.length != data.length) return false
    return data.every((val, idx) => {
        return val === another[idx];
    })
}

export function SniffAudioExt(data: Uint8Array, fallback_ext: string = "mp3"): string {
    if (BytesHasPrefix(data, MP3_HEADER)) return ".mp3"
    if (BytesHasPrefix(data, FLAC_HEADER)) return ".flac"
    if (BytesHasPrefix(data, OGG_HEADER)) return ".ogg"
    if (data.length >= 4 + M4A_HEADER.length &&
        BytesHasPrefix(data.slice(4), M4A_HEADER)) return ".m4a"
    if (BytesHasPrefix(data, WAV_HEADER)) return ".wav"
    if (BytesHasPrefix(data, WMA_HEADER)) return ".wma"
    if (BytesHasPrefix(data, AAC_HEADER)) return ".aac"
    return fallback_ext;
}
