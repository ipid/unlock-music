import { Decrypt as RawDecrypt } from './raw';
import { GetArrayBuffer } from '@/decrypt/utils';
import { DecryptResult } from '@/decrypt/entity';

const segmentSize = 0x20;

function isPrintableAsciiChar(ch: number) {
    return ch >= 0x20 && ch <= 0x7E;
}

function isUpperHexChar(ch: number) {
    return (ch >= 0x30 && ch <= 0x39) || (ch >= 0x41 && ch <= 0x46);
}

/**
 * @param {Buffer} data 
 * @param {Buffer} key 
 * @param {boolean} copy 
 * @returns Buffer
 */
function decryptSegment(data: Uint8Array, key: Uint8Array) {
    for (let i = 0; i < data.byteLength; i++) {
      data[i] -= key[i % segmentSize];
    }
    return Buffer.from(data);
}

export async function Decrypt(file: File, raw_filename: string): Promise<DecryptResult> {
  const buf = new Uint8Array(await GetArrayBuffer(file));

  // 咪咕编码的 WAV 文件有很多“空洞”内容，尝试密钥。
  const header = buf.slice(0, 0x100);
  const bytesRIFF = Buffer.from('RIFF', 'ascii');
  const bytesWaveFormat = Buffer.from('WAVEfmt ', 'ascii');
  const possibleKeys = [];
  
  for (let i = segmentSize; i < segmentSize * 20; i += segmentSize) {
      const possibleKey = buf.slice(i, i + segmentSize);
      if (!possibleKey.every(isUpperHexChar)) continue;
  
      const tempHeader = decryptSegment(header, possibleKey);
      if (tempHeader.slice(0, 4).compare(bytesRIFF)) continue;
      if (tempHeader.slice(8, 16).compare(bytesWaveFormat)) continue;
      
      // fmt chunk 大小可以是 16 / 18 / 40。
      const fmtChunkSize = tempHeader.readUInt32LE(0x10);
      if (![16, 18, 40].includes(fmtChunkSize)) continue;
  
      // 下一个 chunk
      const firstDataChunkOffset = 0x14 + fmtChunkSize;
      const chunkName = tempHeader.slice(firstDataChunkOffset, firstDataChunkOffset + 4);
      if (!chunkName.every(isPrintableAsciiChar)) continue;
  
      const secondDataChunkOffset = firstDataChunkOffset + 8 + tempHeader.readUInt32LE(firstDataChunkOffset + 4);
      if (secondDataChunkOffset <= header.byteLength) {
          const secondChunkName = tempHeader.slice(secondDataChunkOffset, secondDataChunkOffset + 4);
          if (!secondChunkName.every(isPrintableAsciiChar)) continue;
      }
  
      possibleKeys.push(Buffer.from(possibleKey).toString('ascii'));
  }
  
  if (possibleKeys.length <= 0) {
    throw new Error(`ERROR: no suitable key discovered`);
  }
  
  const decryptionKey = Buffer.from(possibleKeys[0], 'ascii');
  decryptSegment(buf, decryptionKey);
  const musicData = new Blob([buf], { type: 'audio/x-wav' });
  return await RawDecrypt(musicData, raw_filename, 'wav', false);
}
