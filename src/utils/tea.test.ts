// Copyright 2021 MengYX. All rights reserved.
//
// Copyright 2015 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in https://go.dev/LICENSE.

import { TeaCipher } from '@/utils/tea';

test('key size', () => {
  // prettier-ignore
  const testKey = new Uint8Array([
    0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
    0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff,
    0x00,
  ])
  expect(() => new TeaCipher(testKey.slice(0, 16))).not.toThrow();

  expect(() => new TeaCipher(testKey)).toThrow();

  expect(() => new TeaCipher(testKey.slice(0, 15))).toThrow();
});

// prettier-ignore
const teaTests = [
  // These were sourced from https://github.com/froydnj/ironclad/blob/master/testing/test-vectors/tea.testvec
  {
    rounds: TeaCipher.numRounds,
    key: new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]),
    plainText: new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    cipherText: new Uint8Array([0x41, 0xea, 0x3a, 0x0a, 0x94, 0xba, 0xa9, 0x40]),
  },
  {
    rounds: TeaCipher.numRounds,
    key: new Uint8Array([
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    ]),
    plainText: new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    cipherText: new Uint8Array([0x31, 0x9b, 0xbe, 0xfb, 0x01, 0x6a, 0xbd, 0xb2]),
  },
  {
    rounds: 16,
    key: new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]),
    plainText: new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    cipherText: new Uint8Array([0xed, 0x28, 0x5d, 0xa1, 0x45, 0x5b, 0x33, 0xc1]),
  },
];

test('rounds', () => {
  const tt = teaTests[0];
  expect(() => new TeaCipher(tt.key, tt.rounds - 1)).toThrow();
});

test('encrypt & decrypt', () => {
  for (const tt of teaTests) {
    const c = new TeaCipher(tt.key, tt.rounds);

    const buf = new Uint8Array(8);
    const bufView = new DataView(buf.buffer);

    c.encrypt(bufView, new DataView(tt.plainText.buffer));
    expect(buf).toStrictEqual(tt.cipherText);

    c.decrypt(bufView, new DataView(tt.cipherText.buffer));
    expect(buf).toStrictEqual(tt.plainText);
  }
});
