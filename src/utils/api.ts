import {fromByteArray as Base64Encode} from "base64-js";

export const IXAREA_API_ENDPOINT = "https://stats.ixarea.com/apis"

export interface UpdateInfo {
    Found: boolean
    HttpsFound: boolean
    Version: string
    URL: string
    Detail: string
}

export async function checkUpdate(version: string): Promise<UpdateInfo> {
    const resp = await fetch(IXAREA_API_ENDPOINT + "/music/app-version", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({"Version": version})
    });
    return await resp.json();
}

export function reportKeyUsage(keyData: Uint8Array, maskData: number[], filename: string, format: string, title: string, artist?: string, album?: string) {
    return fetch(IXAREA_API_ENDPOINT + "/qmcmask/usage", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            Mask: Base64Encode(new Uint8Array(maskData)), Key: Base64Encode(keyData),
            Artist: artist, Title: title, Album: album, Filename: filename, Format: format
        }),
    })
}

interface KeyInfo {
    Matrix44: string
}

export async function queryKeyInfo(keyData: Uint8Array, filename: string, format: string): Promise<KeyInfo> {
    const resp = await fetch(IXAREA_API_ENDPOINT + "/qmcmask/query", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({Format: format, Key: Base64Encode(keyData), Filename: filename, Type: 44}),
    });
    return await resp.json();
}

export interface CoverInfo {
    Id: string
    Type: number
}

export async function queryAlbumCover(title: string, artist?: string, album?: string): Promise<CoverInfo> {
    const endpoint = IXAREA_API_ENDPOINT + "/music/qq-cover"
    const params = new URLSearchParams([["Title", title], ["Artist", artist ?? ""], ["Album", album ?? ""]])
    const resp = await fetch(`${endpoint}?${params.toString()}`)
    return await resp.json()
}
