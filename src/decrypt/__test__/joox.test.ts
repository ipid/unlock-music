import fs from 'fs';
import { storage } from '@/utils/storage';

import { Decrypt as decryptJoox } from '../joox';
import { extractQQMusicMeta as extractQQMusicMetaOrig } from '@/utils/qm_meta';

jest.mock('@/utils/storage');
jest.mock('@/utils/qm_meta');

const loadJooxUUID = storage.loadJooxUUID as jest.MockedFunction<typeof storage.loadJooxUUID>;
const extractQQMusicMeta = extractQQMusicMetaOrig as jest.MockedFunction<typeof extractQQMusicMetaOrig>;

const TEST_UUID_ZEROS = ''.padStart(32, '0');
const encryptedFile1 = fs.readFileSync(__dirname + '/fixture/joox_1.bin');

describe('decrypt/joox', () => {
  it('should be able to decrypt sample file (v4)', async () => {
    loadJooxUUID.mockResolvedValue(TEST_UUID_ZEROS);
    extractQQMusicMeta.mockImplementationOnce(async (blob: Blob) => {
      return {
        title: 'unused',
        album: 'unused',
        blob: blob,
        artist: 'unused',
        imgUrl: 'https://github.com/unlock-music',
      };
    });

    const result = await decryptJoox(new Blob([encryptedFile1]), 'test.bin', 'bin');
    const resultBuf = await result.blob.arrayBuffer();
    expect(resultBuf).toEqual(Buffer.from('Hello World', 'utf-8').buffer);
  });

  it('should reject E!99 files', async () => {
    loadJooxUUID.mockResolvedValue(TEST_UUID_ZEROS);

    const input = new Blob([Buffer.from('E!99....')]);
    await expect(decryptJoox(input, 'test.bin', 'bin')).rejects.toThrow('不支持的 joox 加密格式');
  });

  it('should reject empty uuid', async () => {
    loadJooxUUID.mockResolvedValue('');
    const input = new Blob([encryptedFile1]);
    await expect(decryptJoox(input, 'test.bin', 'bin')).rejects.toThrow('UUID');
  });

  it('should reject invalid uuid', async () => {
    loadJooxUUID.mockResolvedValue('hello!');
    const input = new Blob([encryptedFile1]);
    await expect(decryptJoox(input, 'test.bin', 'bin')).rejects.toThrow('UUID');
  });
});
