declare module "browser-id3-writer" {
    export default class ID3Writer {
        constructor(buffer: Buffer | ArrayBuffer)

        setFrame(name: string, value: string | object | string[])

        addTag(): Uint8Array
    }
}

declare module "metaflac-js" {
    export default class Metaflac {
        constructor(buffer: Buffer)

        setTag(field: string)

        removeTag(name: string)

        importPictureFromBuffer(picture: Buffer)

        save(): Buffer
    }
}


