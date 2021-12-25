import { IAudioMetadata } from 'music-metadata-browser';
import ID3Writer from 'browser-id3-writer';
import MetaFlac from 'metaflac-js';

export const FLAC_HEADER = [0x66, 0x4c, 0x61, 0x43];
export const MP3_HEADER = [0x49, 0x44, 0x33];
export const OGG_HEADER = [0x4f, 0x67, 0x67, 0x53];
export const M4A_HEADER = [0x66, 0x74, 0x79, 0x70];
//prettier-ignore
export const WMA_HEADER = [
  0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11,
  0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c,
];
export const WAV_HEADER = [0x52, 0x49, 0x46, 0x46];
export const AAC_HEADER = [0xff, 0xf1];
export const DFF_HEADER = [0x46, 0x52, 0x4d, 0x38];

export const AudioMimeType: { [key: string]: string } = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wma: 'audio/x-ms-wma',
  wav: 'audio/x-wav',
  dff: 'audio/x-dff',
};

export function BytesHasPrefix(data: Uint8Array, prefix: number[]): boolean {
  if (prefix.length > data.length) return false;
  return prefix.every((val, idx) => {
    return val === data[idx];
  });
}

export function BytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => {
    return val === b[idx];
  });
}

export function SniffAudioExt(data: Uint8Array, fallback_ext: string = 'mp3'): string {
  if (BytesHasPrefix(data, MP3_HEADER)) return 'mp3';
  if (BytesHasPrefix(data, FLAC_HEADER)) return 'flac';
  if (BytesHasPrefix(data, OGG_HEADER)) return 'ogg';
  if (data.length >= 4 + M4A_HEADER.length && BytesHasPrefix(data.slice(4), M4A_HEADER)) return 'm4a';
  if (BytesHasPrefix(data, WAV_HEADER)) return 'wav';
  if (BytesHasPrefix(data, WMA_HEADER)) return 'wma';
  if (BytesHasPrefix(data, AAC_HEADER)) return 'aac';
  if (BytesHasPrefix(data, DFF_HEADER)) return 'dff';
  return fallback_ext;
}

export function GetArrayBuffer(obj: Blob): Promise<ArrayBuffer> {
  if (!!obj.arrayBuffer) return obj.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rs = e.target?.result;
      if (!rs) {
        reject('read file failed');
      } else {
        resolve(rs as ArrayBuffer);
      }
    };
    reader.readAsArrayBuffer(obj);
  });
}

export function GetCoverFromFile(metadata: IAudioMetadata): string {
  if (metadata.common?.picture && metadata.common.picture.length > 0) {
    return URL.createObjectURL(
      new Blob([metadata.common.picture[0].data], { type: metadata.common.picture[0].format }),
    );
  }
  return '';
}

export interface IMusicMetaBasic {
  title: string;
  artist?: string;
}

export function GetMetaFromFile(
  filename: string,
  exist_title?: string,
  exist_artist?: string,
  separator = '-',
): IMusicMetaBasic {
  const meta: IMusicMetaBasic = { title: exist_title ?? '', artist: exist_artist };

  const items = filename.split(separator);
  if (items.length > 1) {
    if (!meta.artist) meta.artist = items[0].trim();
    if (!meta.title) meta.title = items[1].trim();
  } else if (items.length === 1) {
    if (!meta.title) meta.title = items[0].trim();
  }
  return meta;
}

export async function GetImageFromURL(
  src: string,
): Promise<{ mime: string; buffer: ArrayBuffer; url: string } | undefined> {
  try {
    const resp = await fetch(src);
    const mime = resp.headers.get('Content-Type');
    if (mime?.startsWith('image/')) {
      const buffer = await resp.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: mime }));
      return { buffer, url, mime };
    }
  } catch (e) {
    console.warn(e);
  }
}

export interface IMusicMeta {
  title: string;
  artists?: string[];
  album?: string;
  picture?: ArrayBuffer;
  picture_desc?: string;
}

export function WriteMetaToMp3(audioData: Buffer, info: IMusicMeta, original: IAudioMetadata) {
  const writer = new ID3Writer(audioData);

  // reserve original data
  const frames = original.native['ID3v2.4'] || original.native['ID3v2.3'] || original.native['ID3v2.2'] || [];
  frames.forEach((frame) => {
    if (frame.id !== 'TPE1' && frame.id !== 'TIT2' && frame.id !== 'TALB') {
      try {
        writer.setFrame(frame.id, frame.value);
      } catch (e) {}
    }
  });

  const old = original.common;
  writer
    .setFrame('TPE1', old?.artists || info.artists || [])
    .setFrame('TIT2', old?.title || info.title)
    .setFrame('TALB', old?.album || info.album || '');
  if (info.picture) {
    writer.setFrame('APIC', {
      type: 3,
      data: info.picture,
      description: info.picture_desc || '',
    });
  }
  return writer.addTag();
}

export function WriteMetaToFlac(audioData: Buffer, info: IMusicMeta, original: IAudioMetadata) {
  const writer = new MetaFlac(audioData);
  const old = original.common;
  if (!old.title && !old.album && old.artists) {
    writer.setTag('TITLE=' + info.title);
    writer.setTag('ALBUM=' + info.album);
    if (info.artists) {
      writer.removeTag('ARTIST');
      info.artists.forEach((artist) => writer.setTag('ARTIST=' + artist));
    }
  }

  if (info.picture) {
    writer.importPictureFromBuffer(Buffer.from(info.picture));
  }
  return writer.save();
}

export function SplitFilename(n: string): { name: string; ext: string } {
  const pos = n.lastIndexOf('.');
  return {
    ext: n.substring(pos + 1).toLowerCase(),
    name: n.substring(0, pos),
  };
}
