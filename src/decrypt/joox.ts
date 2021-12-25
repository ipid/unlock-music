import jooxFactory from '@unlock-music/joox-crypto';

import { DecryptResult } from './entity';
import { AudioMimeType, GetArrayBuffer, SniffAudioExt } from './utils';

import { MergeUint8Array } from '@/utils/MergeUint8Array';
import { storage } from '@/utils/storage';
import { extractQQMusicMeta } from '@/utils/qm_meta';

export async function Decrypt(file: Blob, raw_filename: string, raw_ext: string): Promise<DecryptResult> {
  const uuid = await storage.loadJooxUUID('');
  if (!uuid || uuid.length !== 32) {
    throw new Error('请在“解密设定”填写应用 Joox 应用的 UUID。');
  }

  const fileBuffer = new Uint8Array(await GetArrayBuffer(file));
  const decryptor = jooxFactory(fileBuffer, uuid);
  if (!decryptor) {
    throw new Error('不支持的 joox 加密格式');
  }

  const musicDecoded = MergeUint8Array(decryptor.decryptFile(fileBuffer));
  const ext = SniffAudioExt(musicDecoded);
  const mime = AudioMimeType[ext];

  const songId = raw_filename.match(/^(\d+)\s\[mqms\d*]$/i)?.[1];
  const { album, artist, imgUrl, blob, title } = await extractQQMusicMeta(
    new Blob([musicDecoded], { type: mime }),
    raw_filename,
    ext,
    songId,
  );

  return {
    title: title,
    artist: artist,
    ext: ext,
    album: album,
    picture: imgUrl,
    file: URL.createObjectURL(blob),
    blob: blob,
    mime: mime,
  };
}
