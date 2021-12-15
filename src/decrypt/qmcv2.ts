import QMCCryptoModule from '@jixun/qmc2-crypto';

// EOF Magic detection.
const DETECTION_SIZE = 40;

// Process in 2m buffer size
const DECRYPTION_BUF_SIZE = 2 * 1024 * 1024;

/**
 * 解密一个 QMC2 加密的文件。
 *
 * 如果检测并解密成功，返回解密后的 Uint8Array 数组，按顺序拼接即可得到完整文件。
 * 若失败，返回 `null`。
 * @param  {ArrayBuffer} mggBlob 读入的文件 Blob
 * @param  {string}         name 文件名
 * @return {Promise<Uint8Array[]|null>}
 */
export async function decryptMGG(mggBlob: ArrayBuffer) {
  // 初始化模组
  const QMCCrypto = await QMCCryptoModule();

  // 申请内存块，并文件末端数据到 WASM 的内存堆
  const detectionBuf = new Uint8Array(mggBlob.slice(-DETECTION_SIZE));
  const pDetectionBuf = QMCCrypto._malloc(detectionBuf.length);
  QMCCrypto.writeArrayToMemory(detectionBuf, pDetectionBuf);

  // 检测结果内存块
  const pDetectionResult = QMCCrypto._malloc(QMCCrypto.sizeof_qmc_detection());

  // 进行检测
  const detectOK = QMCCrypto.detectKeyEndPosition(
    pDetectionResult,
    pDetectionBuf,
    detectionBuf.length
  );

  // 提取结构体内容：
  // (pos: i32; len: i32; error: char[??])
  const position = QMCCrypto.getValue(pDetectionResult, "i32");
  const len = QMCCrypto.getValue(pDetectionResult + 4, "i32");
  const detectionError = QMCCrypto.UTF8ToString(pDetectionResult + 8);

  // 释放内存
  QMCCrypto._free(pDetectionBuf);
  QMCCrypto._free(pDetectionResult);

  if (detectOK) {
    // 计算解密后文件的大小。
    // 之前得到的 position 为相对当前检测数据起点的偏移。
    const decryptedSize = mggBlob.byteLength - DETECTION_SIZE + position;
    // $prog.max = decryptedSize;

    // 提取嵌入到文件的 EKey
    const ekey = new Uint8Array(
      mggBlob.slice(decryptedSize, decryptedSize + len)
    );

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
      const blockData = new Uint8Array(
        mggBlob.slice(offset, offset + blockSize)
      );
      QMCCrypto.writeArrayToMemory(blockData, buf);
      QMCCrypto.decryptStream(hCrypto, buf, offset, blockSize);
      decryptedParts.push(QMCCrypto.HEAPU8.slice(buf, buf + blockSize));

      offset += blockSize;
      bytesToDecrypt -= blockSize;
      // $prog.value = offset;

      // 避免网页卡死，让 event loop 处理一下其它事件。
      // Worker 应该不需要等待也可以？
      // await new Promise((resolve) => setTimeout(resolve));
    }
    QMCCrypto._free(buf);
    hCrypto.delete();

    return decryptedParts;
  } else {
    throw new Error("ERROR: could not decrypt\n       " + detectionError);
  }
}