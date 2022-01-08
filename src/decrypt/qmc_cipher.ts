export interface QmcStreamCipher {
  decrypt(buf: Uint8Array, offset: number): void;
}

export class QmcStaticCipher implements QmcStreamCipher {
  //prettier-ignore
  private static readonly staticCipherBox: Uint8Array = new Uint8Array([
    0x77, 0x48, 0x32, 0x73, 0xDE, 0xF2, 0xC0, 0xC8, //0x00
    0x95, 0xEC, 0x30, 0xB2, 0x51, 0xC3, 0xE1, 0xA0, //0x08
    0x9E, 0xE6, 0x9D, 0xCF, 0xFA, 0x7F, 0x14, 0xD1, //0x10
    0xCE, 0xB8, 0xDC, 0xC3, 0x4A, 0x67, 0x93, 0xD6, //0x18
    0x28, 0xC2, 0x91, 0x70, 0xCA, 0x8D, 0xA2, 0xA4, //0x20
    0xF0, 0x08, 0x61, 0x90, 0x7E, 0x6F, 0xA2, 0xE0, //0x28
    0xEB, 0xAE, 0x3E, 0xB6, 0x67, 0xC7, 0x92, 0xF4, //0x30
    0x91, 0xB5, 0xF6, 0x6C, 0x5E, 0x84, 0x40, 0xF7, //0x38
    0xF3, 0x1B, 0x02, 0x7F, 0xD5, 0xAB, 0x41, 0x89, //0x40
    0x28, 0xF4, 0x25, 0xCC, 0x52, 0x11, 0xAD, 0x43, //0x48
    0x68, 0xA6, 0x41, 0x8B, 0x84, 0xB5, 0xFF, 0x2C, //0x50
    0x92, 0x4A, 0x26, 0xD8, 0x47, 0x6A, 0x7C, 0x95, //0x58
    0x61, 0xCC, 0xE6, 0xCB, 0xBB, 0x3F, 0x47, 0x58, //0x60
    0x89, 0x75, 0xC3, 0x75, 0xA1, 0xD9, 0xAF, 0xCC, //0x68
    0x08, 0x73, 0x17, 0xDC, 0xAA, 0x9A, 0xA2, 0x16, //0x70
    0x41, 0xD8, 0xA2, 0x06, 0xC6, 0x8B, 0xFC, 0x66, //0x78
    0x34, 0x9F, 0xCF, 0x18, 0x23, 0xA0, 0x0A, 0x74, //0x80
    0xE7, 0x2B, 0x27, 0x70, 0x92, 0xE9, 0xAF, 0x37, //0x88
    0xE6, 0x8C, 0xA7, 0xBC, 0x62, 0x65, 0x9C, 0xC2, //0x90
    0x08, 0xC9, 0x88, 0xB3, 0xF3, 0x43, 0xAC, 0x74, //0x98
    0x2C, 0x0F, 0xD4, 0xAF, 0xA1, 0xC3, 0x01, 0x64, //0xA0
    0x95, 0x4E, 0x48, 0x9F, 0xF4, 0x35, 0x78, 0x95, //0xA8
    0x7A, 0x39, 0xD6, 0x6A, 0xA0, 0x6D, 0x40, 0xE8, //0xB0
    0x4F, 0xA8, 0xEF, 0x11, 0x1D, 0xF3, 0x1B, 0x3F, //0xB8
    0x3F, 0x07, 0xDD, 0x6F, 0x5B, 0x19, 0x30, 0x19, //0xC0
    0xFB, 0xEF, 0x0E, 0x37, 0xF0, 0x0E, 0xCD, 0x16, //0xC8
    0x49, 0xFE, 0x53, 0x47, 0x13, 0x1A, 0xBD, 0xA4, //0xD0
    0xF1, 0x40, 0x19, 0x60, 0x0E, 0xED, 0x68, 0x09, //0xD8
    0x06, 0x5F, 0x4D, 0xCF, 0x3D, 0x1A, 0xFE, 0x20, //0xE0
    0x77, 0xE4, 0xD9, 0xDA, 0xF9, 0xA4, 0x2B, 0x76, //0xE8
    0x1C, 0x71, 0xDB, 0x00, 0xBC, 0xFD, 0x0C, 0x6C, //0xF0
    0xA5, 0x47, 0xF7, 0xF6, 0x00, 0x79, 0x4A, 0x11, //0xF8
  ])

  public getMask(offset: number) {
    if (offset > 0x7fff) offset %= 0x7fff;
    return QmcStaticCipher.staticCipherBox[(offset * offset + 27) & 0xff];
  }

  public decrypt(buf: Uint8Array, offset: number) {
    for (let i = 0; i < buf.length; i++) {
      buf[i] ^= this.getMask(offset + i);
    }
  }
}

export class QmcMapCipher implements QmcStreamCipher {
  key: Uint8Array;
  n: number;

  constructor(key: Uint8Array) {
    if (key.length == 0) throw Error('qmc/cipher_map: invalid key size');

    this.key = key;
    this.n = key.length;
  }

  private static rotate(value: number, bits: number) {
    let rotate = (bits + 4) % 8;
    let left = value << rotate;
    let right = value >> rotate;
    return (left | right) & 0xff;
  }

  decrypt(buf: Uint8Array, offset: number): void {
    for (let i = 0; i < buf.length; i++) {
      buf[i] ^= this.getMask(offset + i);
    }
  }

  private getMask(offset: number) {
    if (offset > 0x7fff) offset %= 0x7fff;

    const idx = (offset * offset + 71214) % this.n;
    return QmcMapCipher.rotate(this.key[idx], idx & 0x7);
  }
}

export class QmcRC4Cipher implements QmcStreamCipher {
  private static readonly FIRST_SEGMENT_SIZE = 0x80;
  private static readonly SEGMENT_SIZE = 5120;

  S: Uint8Array;
  N: number;
  key: Uint8Array;
  hash: number;

  constructor(key: Uint8Array) {
    if (key.length == 0) {
      throw Error('invalid key size');
    }

    this.key = key;
    this.N = key.length;

    // init seed box
    this.S = new Uint8Array(this.N);
    for (let i = 0; i < this.N; ++i) {
      this.S[i] = i & 0xff;
    }
    let j = 0;
    for (let i = 0; i < this.N; ++i) {
      j = (this.S[i] + j + this.key[i % this.N]) % this.N;
      [this.S[i], this.S[j]] = [this.S[j], this.S[i]];
    }

    // init hash base
    this.hash = 1;
    for (let i = 0; i < this.N; i++) {
      let value = this.key[i];

      // ignore if key char is '\x00'
      if (!value) continue;

      const next_hash = (this.hash * value) >>> 0;
      if (next_hash == 0 || next_hash <= this.hash) break;

      this.hash = next_hash;
    }
  }

  decrypt(buf: Uint8Array, offset: number): void {
    let toProcess = buf.length;
    let processed = 0;
    const postProcess = (len: number): boolean => {
      toProcess -= len;
      processed += len;
      offset += len;
      return toProcess == 0;
    };

    // Initial segment
    if (offset < QmcRC4Cipher.FIRST_SEGMENT_SIZE) {
      const len_segment = Math.min(buf.length, QmcRC4Cipher.FIRST_SEGMENT_SIZE - offset);
      this.encFirstSegment(buf.subarray(0, len_segment), offset);
      if (postProcess(len_segment)) return;
    }

    // align segment
    if (offset % QmcRC4Cipher.SEGMENT_SIZE != 0) {
      const len_segment = Math.min(QmcRC4Cipher.SEGMENT_SIZE - (offset % QmcRC4Cipher.SEGMENT_SIZE), toProcess);
      this.encASegment(buf.subarray(processed, processed + len_segment), offset);
      if (postProcess(len_segment)) return;
    }

    // Batch process segments
    while (toProcess > QmcRC4Cipher.SEGMENT_SIZE) {
      this.encASegment(buf.subarray(processed, processed + QmcRC4Cipher.SEGMENT_SIZE), offset);
      postProcess(QmcRC4Cipher.SEGMENT_SIZE);
    }

    // Last segment (incomplete segment)
    if (toProcess > 0) {
      this.encASegment(buf.subarray(processed), offset);
    }
  }

  private encFirstSegment(buf: Uint8Array, offset: number) {
    for (let i = 0; i < buf.length; i++) {
      buf[i] ^= this.key[this.getSegmentKey(offset + i)];
    }
  }

  private encASegment(buf: Uint8Array, offset: number) {
    // Initialise a new seed box
    const S = this.S.slice(0);

    // Calculate the number of bytes to skip.
    // The initial "key" derived from segment id, plus the current offset.
    const skipLen =
      (offset % QmcRC4Cipher.SEGMENT_SIZE) + this.getSegmentKey(Math.floor(offset / QmcRC4Cipher.SEGMENT_SIZE));

    // decrypt the block
    let j = 0;
    let k = 0;
    for (let i = -skipLen; i < buf.length; i++) {
      j = (j + 1) % this.N;
      k = (S[j] + k) % this.N;
      [S[k], S[j]] = [S[j], S[k]];

      if (i >= 0) {
        buf[i] ^= S[(S[j] + S[k]) % this.N];
      }
    }
  }

  private getSegmentKey(id: number): number {
    const seed = this.key[id % this.N];
    const idx = Math.floor((this.hash / ((id + 1) * seed)) * 100.0);
    return idx % this.N;
  }
}
