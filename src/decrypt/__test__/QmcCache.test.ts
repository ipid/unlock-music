import { DecryptBuffer as DecryptQmcCacheBuffer } from '../qmccache';
import fs from 'fs';

const expectedBuffer = fs.readFileSync(__dirname + '/fixture/qmc_cache_expected.bin');

const createInputBuffer = () => {
  const buffer = Buffer.alloc(256);
  for (let i = buffer.byteLength; i >= 0; i--) {
    buffer[i] = i;
  }
  return buffer;
};

describe('decrypt/qmccache', () => {
  it('should decrypt specified buffer correctly', () => {
    const input = createInputBuffer();
    DecryptQmcCacheBuffer(input);
    expect(input).toEqual(expectedBuffer);
  });
});
