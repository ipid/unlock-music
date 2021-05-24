import {DecryptResult} from "@/decrypt/entity";

export enum FilenamePolicy {
    ArtistAndTitle,
    TitleOnly,
    TitleAndArtist,
    SameAsOriginal,
}

export const FilenamePolicies: { key: FilenamePolicy, text: string }[] = [
    {key: FilenamePolicy.ArtistAndTitle, text: "歌手-歌曲名"},
    {key: FilenamePolicy.TitleOnly, text: "歌曲名"},
    {key: FilenamePolicy.TitleAndArtist, text: "歌曲名-歌手"},
    {key: FilenamePolicy.SameAsOriginal, text: "同源文件名"},
]


export function DownloadBlobMusic(data: DecryptResult, policy: FilenamePolicy) {
    const a = document.createElement('a');
    a.href = data.file;
    switch (policy) {
        default:
        case FilenamePolicy.ArtistAndTitle:
            a.download = data.artist + " - " + data.title + "." + data.ext;
            break;
        case FilenamePolicy.TitleOnly:
            a.download = data.title + "." + data.ext;
            break;
        case FilenamePolicy.TitleAndArtist:
            a.download = data.title + " - " + data.artist + "." + data.ext;
            break;
        case FilenamePolicy.SameAsOriginal:
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
