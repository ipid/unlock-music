export interface FileSystemGetFileOptions {
    create?: boolean
}

interface FileSystemCreateWritableOptions {
    keepExistingData?: boolean
}

interface FileSystemRemoveOptions {
    recursive?: boolean
}

interface FileSystemFileHandle {
    getFile(): Promise<File>;

    createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>
}

enum WriteCommandType {
    write = "write",
    seek = "seek",
    truncate = "truncate",
}

interface WriteParams {
    type: WriteCommandType
    size?: number
    position?: number
    data: BufferSource | Blob | string
}

type FileSystemWriteChunkType = BufferSource | Blob | string | WriteParams

interface FileSystemWritableFileStream extends WritableStream {
    write(data: FileSystemWriteChunkType): Promise<undefined>

    seek(position: number): Promise<undefined>

    truncate(size: number): Promise<undefined>

    close(): Promise<undefined> // should be implemented in WritableStream
}


export declare interface FileSystemDirectoryHandle {
    getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>

    removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<undefined>

}

declare global {
    interface Window {

        showDirectoryPicker?(): Promise<FileSystemDirectoryHandle>
    }
}

