export interface DecryptResult {
    status: boolean,//todo: remove & use Exception

    title: string
    album?: string
    artist?: string

    mime: string
    ext: string

    file: string
    picture: string

    message?: string
    rawExt?: string
    rawFilename?: string

}
