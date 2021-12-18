// Copyright 2021 MengYX. All rights reserved.
//
// Copyright 2015 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in https://go.dev/LICENSE.

// TeaCipher is a typescript port to golang.org/x/crypto/tea

// Package tea implements the TEA algorithm, as defined in Needham and
// Wheeler's 1994 technical report, “TEA, a Tiny Encryption Algorithm”. See
// http://www.cix.co.uk/~klockstone/tea.pdf for details.
//
// TEA is a legacy cipher and its short block size makes it vulnerable to
// birthday bound attacks (see https://sweet32.info). It should only be used
// where compatibility with legacy systems, not security, is the goal.

export class TeaCipher {
  // BlockSize is the size of a TEA block, in bytes.
  static readonly BlockSize = 8;

  // KeySize is the size of a TEA key, in bytes.
  static readonly KeySize = 16;

  // delta is the TEA key schedule constant.
  static readonly delta = 0x9e3779b9;

  // numRounds 64 is the standard number of rounds in TEA.
  static readonly numRounds = 64;

  k0: number;
  k1: number;
  k2: number;
  k3: number;
  rounds: number;

  constructor(key: Uint8Array, rounds: number = TeaCipher.numRounds) {
    if (key.length != 16) {
      throw Error('incorrect key size');
    }
    if ((rounds & 1) != 0) {
      throw Error('odd number of rounds specified');
    }

    const k = new DataView(key.buffer);
    this.k0 = k.getUint32(0, false);
    this.k1 = k.getUint32(4, false);
    this.k2 = k.getUint32(8, false);
    this.k3 = k.getUint32(12, false);
    this.rounds = rounds;
  }

  encrypt(dst: DataView, src: DataView) {
    let v0 = src.getUint32(0, false);
    let v1 = src.getUint32(4, false);

    let sum = 0;
    for (let i = 0; i < this.rounds / 2; i++) {
      sum = sum + TeaCipher.delta;
      v0 += ((v1 << 4) + this.k0) ^ (v1 + sum) ^ ((v1 >>> 5) + this.k1);
      v1 += ((v0 << 4) + this.k2) ^ (v0 + sum) ^ ((v0 >>> 5) + this.k3);
    }

    dst.setUint32(0, v0, false);
    dst.setUint32(4, v1, false);
  }

  decrypt(dst: DataView, src: DataView) {
    let v0 = src.getUint32(0, false);
    let v1 = src.getUint32(4, false);

    let sum = (TeaCipher.delta * this.rounds) / 2;
    for (let i = 0; i < this.rounds / 2; i++) {
      v1 -= ((v0 << 4) + this.k2) ^ (v0 + sum) ^ ((v0 >>> 5) + this.k3);
      v0 -= ((v1 << 4) + this.k0) ^ (v1 + sum) ^ ((v1 >>> 5) + this.k1);
      sum -= TeaCipher.delta;
    }
    dst.setUint32(0, v0, false);
    dst.setUint32(4, v1, false);
  }
}
