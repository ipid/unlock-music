import { DecryptResult } from './entity';
import { AudioMimeType, GetArrayBuffer, SniffAudioExt } from './utils';

import jooxFactory from '@unlock-music/joox-crypto';
import storage from '@/utils/storage';
import { MergeUint8Array } from '@/utils/MergeUint8Array';

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
  const musicBlob = new Blob([musicDecoded], { type: mime });

  return {
    title: raw_filename.replace(/\.[^\.]+$/, ''),
    artist: '未知',
    album: '未知',
    file: URL.createObjectURL(musicBlob),
    blob: musicBlob,
    mime: mime,
    ext: ext,
  };
}
