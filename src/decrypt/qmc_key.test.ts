import { QmcDeriveKey, simpleMakeKey } from '@/decrypt/qmc_key';
import fs from 'fs';

test('key dec: make simple key', () => {
  expect(simpleMakeKey(106, 8)).toStrictEqual([0x69, 0x56, 0x46, 0x38, 0x2b, 0x20, 0x15, 0x0b]);
});

function loadTestDataKeyDecrypt(name: string): {
  cipherText: Uint8Array;
  clearText: Uint8Array;
} {
  return {
    cipherText: fs.readFileSync(`testdata/${name}_key_raw.bin`),
    clearText: fs.readFileSync(`testdata/${name}_key.bin`),
  };
}

test('key dec: real file', async () => {
  const cases = ['mflac_map', 'mgg_map', 'mflac0_rc4', 'mflac_rc4'];
  for (const name of cases) {
    const { clearText, cipherText } = loadTestDataKeyDecrypt(name);
    const buf = QmcDeriveKey(cipherText);

    expect(buf).toStrictEqual(clearText);
  }
});
