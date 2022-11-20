import { TeaCipher } from '@/utils/tea';

const SALT_LEN = 2;
const ZERO_LEN = 7;

export function QmcDeriveKey(raw: Uint8Array): Uint8Array {
  const textDec = new TextDecoder();
  let rawDec = Buffer.from(textDec.decode(raw), 'base64');
  let n = rawDec.length;
  if (n < 16) {
    throw Error('key length is too short');
  }

  rawDec = decryptV2Key(rawDec);

  const simpleKey = simpleMakeKey(106, 8);
  let teaKey = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    teaKey[i << 1] = simpleKey[i];
    teaKey[(i << 1) + 1] = rawDec[i];
  }
  const sub = decryptTencentTea(rawDec.subarray(8), teaKey);
  rawDec.set(sub, 8);
  return rawDec.subarray(0, 8 + sub.length);
}

// simpleMakeKey exported only for unit test
export function simpleMakeKey(salt: number, length: number): number[] {
  const keyBuf: number[] = [];
  for (let i = 0; i < length; i++) {
    const tmp = Math.tan(salt + i * 0.1);
    keyBuf[i] = 0xff & (Math.abs(tmp) * 100.0);
  }
  return keyBuf;
}

const mixKey1: Uint8Array = new Uint8Array([ 0x33, 0x38, 0x36, 0x5A, 0x4A, 0x59, 0x21, 0x40, 0x23, 0x2A, 0x24, 0x25, 0x5E, 0x26, 0x29, 0x28 ])
const mixKey2: Uint8Array = new Uint8Array([ 0x2A, 0x2A, 0x23, 0x21, 0x28, 0x23, 0x24, 0x25, 0x26, 0x5E, 0x61, 0x31, 0x63, 0x5A, 0x2C, 0x54 ])

function decryptV2Key(key: Buffer): Buffer
{
  const textEnc = new TextDecoder();
  if (key.length < 18 || textEnc.decode(key.slice(0, 18)) !== 'QQMusic EncV2,Key:') {
    return key;
  }

  let out = decryptTencentTea(key.slice(18), mixKey1);
  out = decryptTencentTea(out, mixKey2);
  const textDec = new TextDecoder();
  const keyDec = Buffer.from(textDec.decode(out), 'base64');
  let n = keyDec.length;
  if (n < 16) {
    throw Error('EncV2 key decode failed');
  }

  return keyDec;
}

function decryptTencentTea(inBuf: Uint8Array, key: Uint8Array): Uint8Array {
  if (inBuf.length % 8 != 0) {
    throw Error('inBuf size not a multiple of the block size');
  }
  if (inBuf.length < 16) {
    throw Error('inBuf size too small');
  }

  const blk = new TeaCipher(key, 32);

  const tmpBuf = new Uint8Array(8);
  const tmpView = new DataView(tmpBuf.buffer);

  blk.decrypt(tmpView, new DataView(inBuf.buffer, inBuf.byteOffset, 8));

  const nPadLen = tmpBuf[0] & 0x7; //只要最低三位
  /*密文格式:PadLen(1byte)+Padding(var,0-7byte)+Salt(2byte)+Body(var byte)+Zero(7byte)*/
  const outLen = inBuf.length - 1 /*PadLen*/ - nPadLen - SALT_LEN - ZERO_LEN;
  const outBuf = new Uint8Array(outLen);

  let ivPrev = new Uint8Array(8);
  let ivCur = inBuf.slice(0, 8); // init iv
  let inBufPos = 8;

  // 跳过 Padding Len 和 Padding
  let tmpIdx = 1 + nPadLen;

  // CBC IV 处理
  const cryptBlock = () => {
    ivPrev = ivCur;
    ivCur = inBuf.slice(inBufPos, inBufPos + 8);
    for (let j = 0; j < 8; j++) {
      tmpBuf[j] ^= ivCur[j];
    }
    blk.decrypt(tmpView, tmpView);
    inBufPos += 8;
    tmpIdx = 0;
  };

  // 跳过 Salt
  for (let i = 1; i <= SALT_LEN; ) {
    if (tmpIdx < 8) {
      tmpIdx++;
      i++;
    } else {
      cryptBlock();
    }
  }

  // 还原明文
  let outBufPos = 0;
  while (outBufPos < outLen) {
    if (tmpIdx < 8) {
      outBuf[outBufPos] = tmpBuf[tmpIdx] ^ ivPrev[tmpIdx];
      outBufPos++;
      tmpIdx++;
    } else {
      cryptBlock();
    }
  }

  // 校验Zero
  for (let i = 1; i <= ZERO_LEN; i++) {
    if (tmpBuf[tmpIdx] != ivPrev[tmpIdx]) {
      throw Error('zero check failed');
    }
  }
  return outBuf;
}
