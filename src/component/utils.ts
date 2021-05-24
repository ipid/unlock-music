import {DecryptResult} from "@/decrypt/entity";

export function DownloadBlobMusic(data: DecryptResult, format: string) {//todo: use enum
    const a = document.createElement('a');
    a.href = data.file;
    switch (format) {
        default:
        case "1":
            a.download = data.artist + " - " + data.title + "." + data.ext;
            break;
        case "2":
            a.download = data.title + "." + data.ext;
            break;
        case "3":
            a.download = data.title + " - " + data.artist + "." + data.ext;
            break;
        case "4":
            a.download = data.rawFilename + "." + data.ext;
            break;
    }
    document.body.append(a);
    a.click();
    a.remove();
}

export function RemoveBlobMusic(data: DecryptResult) {
    URL.revokeObjectURL(data.file);
    if (data.picture?.startsWith("blob:")) {
        URL.revokeObjectURL(data.picture);
    }
}

export class DecryptQueue {
    private readonly pending: (() => Promise<void>)[];

    constructor() {
        this.pending = []
    }

    queue(fn: () => Promise<void>) {
        this.pending.push(fn)
        this.consume()
    }

    private consume() {
        const fn = this.pending.shift()
        if (fn) fn().then(() => this.consume).catch(console.error)
    }
}
