import { QmcMapCipher, QmcRC4Cipher, QmcStaticCipher } from '@/decrypt/qmc_cipher';
import fs from 'fs';

test('static cipher [0x7ff8,0x8000) ', () => {
  //prettier-ignore
  const expected = new Uint8Array([
    0xD8, 0x52, 0xF7, 0x67, 0x90, 0xCA, 0xD6, 0x4A,
    0x4A, 0xD6, 0xCA, 0x90, 0x67, 0xF7, 0x52, 0xD8,
  ])

  const c = new QmcStaticCipher();
  const buf = new Uint8Array(16);
  c.decrypt(buf, 0x7ff8);

  expect(buf).toStrictEqual(expected);
});

test('static cipher [0,0x10) ', () => {
  //prettier-ignore
  const expected = new Uint8Array([
    0xC3, 0x4A, 0xD6, 0xCA, 0x90, 0x67, 0xF7, 0x52,
    0xD8, 0xA1, 0x66, 0x62, 0x9F, 0x5B, 0x09, 0x00,
  ])

  const c = new QmcStaticCipher();
  const buf = new Uint8Array(16);
  c.decrypt(buf, 0);

  expect(buf).toStrictEqual(expected);
});

test('map cipher: get mask', () => {
  //prettier-ignore
  const expected = new Uint8Array([
    0xBB, 0x7D, 0x80, 0xBE, 0xFF, 0x38, 0x81, 0xFB,
    0xBB, 0xFF, 0x82, 0x3C, 0xFF, 0xBA, 0x83, 0x79,
  ])
  const key = new Uint8Array(256);
  for (let i = 0; i < 256; i++) key[i] = i;
  const buf = new Uint8Array(16);

  const c = new QmcMapCipher(key);
  c.decrypt(buf, 0);
  expect(buf).toStrictEqual(expected);
});

function loadTestDataCipher(name: string): {
  key: Uint8Array;
  cipherText: Uint8Array;
  clearText: Uint8Array;
} {
  return {
    key: fs.readFileSync(`testdata/${name}_key.bin`),
    cipherText: fs.readFileSync(`testdata/${name}_raw.bin`),
    clearText: fs.readFileSync(`testdata/${name}_target.bin`),
  };
}

test('map cipher: real file', async () => {
  const cases = ['mflac_map', 'mgg_map'];
  for (const name of cases) {
    const { key, clearText, cipherText } = loadTestDataCipher(name);
    const c = new QmcMapCipher(key);

    c.decrypt(cipherText, 0);

    expect(cipherText).toStrictEqual(clearText);
  }
});

test('rc4 cipher: real file', async () => {
  const cases = ['mflac0_rc4', 'mflac_rc4'];
  for (const name of cases) {
    const { key, clearText, cipherText } = loadTestDataCipher(name);
    const c = new QmcRC4Cipher(key);

    c.decrypt(cipherText, 0);

    expect(cipherText).toStrictEqual(clearText);
  }
});

test('rc4 cipher: first segment', async () => {
  const cases = ['mflac0_rc4', 'mflac_rc4'];
  for (const name of cases) {
    const { key, clearText, cipherText } = loadTestDataCipher(name);
    const c = new QmcRC4Cipher(key);

    const buf = cipherText.slice(0, 128);
    c.decrypt(buf, 0);
    expect(buf).toStrictEqual(clearText.slice(0, 128));
  }
});

test('rc4 cipher: align block (128~5120)', async () => {
  const cases = ['mflac0_rc4', 'mflac_rc4'];
  for (const name of cases) {
    const { key, clearText, cipherText } = loadTestDataCipher(name);
    const c = new QmcRC4Cipher(key);

    const buf = cipherText.slice(128, 5120);
    c.decrypt(buf, 128);
    expect(buf).toStrictEqual(clearText.slice(128, 5120));
  }
});

test('rc4 cipher: simple block (5120~10240)', async () => {
  const cases = ['mflac0_rc4', 'mflac_rc4'];
  for (const name of cases) {
    const { key, clearText, cipherText } = loadTestDataCipher(name);
    const c = new QmcRC4Cipher(key);

    const buf = cipherText.slice(5120, 10240);
    c.decrypt(buf, 5120);
    expect(buf).toStrictEqual(clearText.slice(5120, 10240));
  }
});
