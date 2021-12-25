import QMCCryptoModule from '@jixun/qmc2-crypto/QMC2-wasm-bundle';
import { MergeUint8Array } from '@/utils/MergeUint8Array';
import { QMCCrypto } from '@jixun/qmc2-crypto/QMCCrypto';

// 检测文件末端使用的缓冲区大小
const DETECTION_SIZE = 40;

// 每次处理 2M 的数据
const DECRYPTION_BUF_SIZE = 2 * 1024 * 1024;

export interface QMC2DecryptionResult {
  success: boolean;
  data: Uint8Array;
  songId: string | number;
  error: string;
}

/**
 * 解密一个 QMC2 加密的文件。
 *
 * 如果检测并解密成功，返回解密后的 Uint8Array 数据。
 * @param  {ArrayBuffer} mggBlob 读入的文件 Blob
 */
export async function DecryptQMCWasm(mggBlob: ArrayBuffer): Promise<QMC2DecryptionResult> {
  const result: QMC2DecryptionResult = { success: false, data: new Uint8Array(), songId: 0, error: '' };

  // 初始化模组
  let QMCCrypto: QMCCrypto;

  try {
    QMCCrypto = await QMCCryptoModule();
  } catch (err: any) {
    result.error = err?.message || 'wasm 加载失败';
    return result;
  }

  // 申请内存块，并文件末端数据到 WASM 的内存堆
  const detectionBuf = new Uint8Array(mggBlob.slice(-DETECTION_SIZE));
  const pDetectionBuf = QMCCrypto._malloc(detectionBuf.length);
  QMCCrypto.writeArrayToMemory(detectionBuf, pDetectionBuf);

  // 检测结果内存块
  const pDetectionResult = QMCCrypto._malloc(QMCCrypto.sizeof_qmc_detection());

  // 进行检测
  const detectOK = QMCCrypto.detectKeyEndPosition(pDetectionResult, pDetectionBuf, detectionBuf.length);

  // 提取结构体内容：
  // (pos: i32; len: i32; error: char[??])
  const position = QMCCrypto.getValue(pDetectionResult, 'i32');
  const len = QMCCrypto.getValue(pDetectionResult + 4, 'i32');

  result.success = detectOK;
  result.error = QMCCrypto.UTF8ToString(
    pDetectionResult + QMCCrypto.offsetof_error_msg(),
    QMCCrypto.sizeof_error_msg(),
  );
  const songId = QMCCrypto.UTF8ToString(pDetectionResult + QMCCrypto.offsetof_song_id(), QMCCrypto.sizeof_song_id());
  if (!songId) {
    console.debug('qmc2-wasm: songId not found');
  } else if (/^\d+$/.test(songId)) {
    result.songId = songId;
  } else {
    console.warn('qmc2-wasm: Invalid songId: %s', songId);
  }

  // 释放内存
  QMCCrypto._free(pDetectionBuf);
  QMCCrypto._free(pDetectionResult);

  if (!detectOK) {
    return result;
  }

  // 计算解密后文件的大小。
  // 之前得到的 position 为相对当前检测数据起点的偏移。
  const decryptedSize = mggBlob.byteLength - DETECTION_SIZE + position;

  // 提取嵌入到文件的 EKey
  const ekey = new Uint8Array(mggBlob.slice(decryptedSize, decryptedSize + len));

  // 解码 UTF-8 数据到 string
  const decoder = new TextDecoder();
  const ekey_b64 = decoder.decode(ekey);

  // 初始化加密与缓冲区
  const hCrypto = QMCCrypto.createInstWidthEKey(ekey_b64);
  const buf = QMCCrypto._malloc(DECRYPTION_BUF_SIZE);

  const decryptedParts = [];
  let offset = 0;
  let bytesToDecrypt = decryptedSize;
  while (bytesToDecrypt > 0) {
    const blockSize = Math.min(bytesToDecrypt, DECRYPTION_BUF_SIZE);

    // 解密一些片段
    const blockData = new Uint8Array(mggBlob.slice(offset, offset + blockSize));
    QMCCrypto.writeArrayToMemory(blockData, buf);
    QMCCrypto.decryptStream(hCrypto, buf, offset, blockSize);
    decryptedParts.push(QMCCrypto.HEAPU8.slice(buf, buf + blockSize));

    offset += blockSize;
    bytesToDecrypt -= blockSize;
  }
  QMCCrypto._free(buf);
  hCrypto.delete();

  result.data = MergeUint8Array(decryptedParts);

  return result;
}
