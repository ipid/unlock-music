import { Decrypt as RawDecrypt } from './raw';
import { GetArrayBuffer } from '@/decrypt/utils';
import { DecryptResult } from '@/decrypt/entity';

const TM_HEADER = [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70];

export async function Decrypt(file: File, raw_filename: string): Promise<DecryptResult> {
  const audioData = new Uint8Array(await GetArrayBuffer(file));
  for (let cur = 0; cur < 8; ++cur) {
    audioData[cur] = TM_HEADER[cur];
  }
  const musicData = new Blob([audioData], { type: 'audio/mp4' });
  return await RawDecrypt(musicData, raw_filename, 'm4a', false);
}
