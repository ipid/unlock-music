import KgmCryptoModule from '@/KgmWasm/KgmWasmBundle';
import { MergeUint8Array } from '@/utils/MergeUint8Array';

// 每次处理 2M 的数据
const DECRYPTION_BUF_SIZE = 2 *1024 * 1024;

export interface KGMDecryptionResult {
  success: boolean;
  data: Uint8Array;
  error: string;
}

/**
 * 解密一个 KGM 加密的文件。
 *
 * 如果检测并解密成功，返回解密后的 Uint8Array 数据。
 * @param  {ArrayBuffer} kgmBlob 读入的文件 Blob
 */
export async function DecryptKgmWasm(kgmBlob: ArrayBuffer, ext: string): Promise<KGMDecryptionResult> {
  const result: KGMDecryptionResult = { success: false, data: new Uint8Array(), error: '' };

  // 初始化模组
  let KgmCrypto: any;

  try {
    KgmCrypto = await KgmCryptoModule();
  } catch (err: any) {
    result.error = err?.message || 'wasm 加载失败';
    return result;
  }
  if (!KgmCrypto) {
    result.error = 'wasm 加载失败';
    return result;
  }

  // 申请内存块，并文件末端数据到 WASM 的内存堆
  let kgmBuf = new Uint8Array(kgmBlob);
  const pQmcBuf = KgmCrypto._malloc(DECRYPTION_BUF_SIZE);
  KgmCrypto.writeArrayToMemory(kgmBuf.slice(0, DECRYPTION_BUF_SIZE), pQmcBuf);

  // 进行解密初始化
  const headerSize = KgmCrypto.preDec(pQmcBuf, DECRYPTION_BUF_SIZE, ext);
  console.log(headerSize);
  kgmBuf = kgmBuf.slice(headerSize);

  const decryptedParts = [];
  let offset = 0;
  let bytesToDecrypt = kgmBuf.length;
  while (bytesToDecrypt > 0) {
    const blockSize = Math.min(bytesToDecrypt, DECRYPTION_BUF_SIZE);

    // 解密一些片段
    const blockData = new Uint8Array(kgmBuf.slice(offset, offset + blockSize));
    KgmCrypto.writeArrayToMemory(blockData, pQmcBuf);
    KgmCrypto.decBlob(pQmcBuf, blockSize, offset);
    decryptedParts.push(KgmCrypto.HEAPU8.slice(pQmcBuf, pQmcBuf + blockSize));

    offset += blockSize;
    bytesToDecrypt -= blockSize;
  }
  KgmCrypto._free(pQmcBuf);

  result.data = MergeUint8Array(decryptedParts);
  result.success = true;

  return result;
}
