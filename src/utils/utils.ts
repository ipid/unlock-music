import { DecryptResult } from '@/decrypt/entity';
import { FileSystemDirectoryHandle } from '@/shims-fs';

export enum FilenamePolicy {
  ArtistAndTitle,
  TitleOnly,
  TitleAndArtist,
  SameAsOriginal,
}

export const FilenamePolicies: { key: FilenamePolicy; text: string }[] = [
  { key: FilenamePolicy.ArtistAndTitle, text: '歌手-歌曲名' },
  { key: FilenamePolicy.TitleOnly, text: '歌曲名' },
  { key: FilenamePolicy.TitleAndArtist, text: '歌曲名-歌手' },
  { key: FilenamePolicy.SameAsOriginal, text: '同源文件名' },
];

export function GetDownloadFilename(data: DecryptResult, policy: FilenamePolicy): string {
  switch (policy) {
    case FilenamePolicy.TitleOnly:
      return `${data.title}.${data.ext}`;
    case FilenamePolicy.TitleAndArtist:
      return `${data.title} - ${data.artist}.${data.ext}`;
    case FilenamePolicy.SameAsOriginal:
      return `${data.rawFilename}.${data.ext}`;
    default:
    case FilenamePolicy.ArtistAndTitle:
      return `${data.artist} - ${data.title}.${data.ext}`;
  }
}

export async function DirectlyWriteFile(data: DecryptResult, policy: FilenamePolicy, dir: FileSystemDirectoryHandle) {
  let filename = GetDownloadFilename(data, policy);
  // prevent filename exist
  try {
    await dir.getFileHandle(filename);
    filename = `${new Date().getTime()} - ${filename}`;
  } catch (e) {}
  const file = await dir.getFileHandle(filename, { create: true });
  const w = await file.createWritable();
  await w.write(data.blob);
  await w.close();
}

export function DownloadBlobMusic(data: DecryptResult, policy: FilenamePolicy) {
  const a = document.createElement('a');
  a.href = data.file;
  a.download = GetDownloadFilename(data, policy);
  document.body.append(a);
  a.click();
  a.remove();
}

export function RemoveBlobMusic(data: DecryptResult) {
  URL.revokeObjectURL(data.file);
  if (data.picture?.startsWith('blob:')) {
    URL.revokeObjectURL(data.picture);
  }
}

export class DecryptQueue {
  private readonly pending: (() => Promise<void>)[];

  constructor() {
    this.pending = [];
  }

  queue(fn: () => Promise<void>) {
    this.pending.push(fn);
    this.consume();
  }

  private consume() {
    const fn = this.pending.shift();
    if (fn)
      fn()
        .then(() => this.consume)
        .catch(console.error);
  }
}
