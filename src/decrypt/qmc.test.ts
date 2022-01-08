import fs from 'fs';
import { QmcDecoder } from '@/decrypt/qmc';
import { BytesEqual } from '@/decrypt/utils';

function loadTestDataDecoder(name: string): {
  cipherText: Uint8Array;
  clearText: Uint8Array;
} {
  const cipherBody = fs.readFileSync(`./testdata/${name}_raw.bin`);
  const cipherSuffix = fs.readFileSync(`./testdata/${name}_suffix.bin`);
  const cipherText = new Uint8Array(cipherBody.length + cipherSuffix.length);
  cipherText.set(cipherBody);
  cipherText.set(cipherSuffix, cipherBody.length);
  return {
    cipherText,
    clearText: fs.readFileSync(`testdata/${name}_target.bin`),
  };
}

test('qmc: real file', async () => {
  const cases = ['mflac0_rc4', 'mflac_rc4', 'mflac_map', 'mgg_map', 'qmc0_static'];
  for (const name of cases) {
    const { clearText, cipherText } = loadTestDataDecoder(name);
    const c = new QmcDecoder(cipherText);
    const buf = c.decrypt();

    expect(BytesEqual(buf, clearText)).toBeTruthy();
  }
});
