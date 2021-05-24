export interface DecryptResult {
    title: string
    album?: string
    artist?: string

    mime: string
    ext: string

    file: string
    blob: Blob
    picture?: string

    message?: string
    rawExt?: string
    rawFilename?: string

}

export interface FileInfo {
    status: string
    name: string,
    size: number,
    percentage: number,
    uid: number,
    raw: File
}
