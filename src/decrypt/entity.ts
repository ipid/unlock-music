export interface DecryptResult {
    title: string
    album?: string
    artist?: string

    mime: string
    ext: string

    file: string
    picture?: string

    message?: string
    rawExt?: string
    rawFilename?: string

}
