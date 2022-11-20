#ifndef QQMUSIC_CPP_TENCENTTEA_HPP
#define QQMUSIC_CPP_TENCENTTEA_HPP

#include <cstdlib>
#include <cstdio>
#include <cstdint>
#include <vector>
#include <time.h>
#include <arpa/inet.h>

const uint32_t DELTA = 0x9e3779b9;

#define ROUNDS 32
#define SALT_LEN 2
#define ZERO_LEN 7

void TeaDecryptECB(uint8_t* src, uint8_t* dst, std::vector<uint8_t> key, size_t rounds = ROUNDS) {
    if (key.size() != 16 || (rounds & 1) != 0)
    {
        return;
    }
    uint32_t y, z, sum;
    uint32_t k[4];
    int i;

    //now encrypted buf is TCP/IP-endian;
    //TCP/IP network byte order (which is big-endian).
    y = ntohl(*((uint32_t*)src));
    z = ntohl(*((uint32_t*)(src + 4)));
    //std::cout << ntohl(0x0a3aea41);

    for (i = 0; i < 4; i++) {
        //key is TCP/IP-endian;
        k[i] = ntohl(*((uint32_t*)(key.data() + i * 4)));
    }

    sum = (DELTA * rounds);
    for (i = 0; i < rounds; i++) {
        z -= ((y << 4) + k[2]) ^ (y + sum) ^ ((y >> 5) + k[3]);
        y -= ((z << 4) + k[0]) ^ (z + sum) ^ ((z >> 5) + k[1]);
        sum -= DELTA;
    }

    *((uint32_t*)dst) = ntohl(y);
    *((uint32_t*)(dst + 4)) = ntohl(z);

    //now plain-text is TCP/IP-endian;
}

void TeaEncryptECB(uint8_t* src, uint8_t* dst, std::vector<uint8_t> key, size_t rounds = ROUNDS) {
    if (key.size() != 16 || (rounds & 1) != 0)
    {
        return;
    }
    uint32_t y, z, sum;
    uint32_t k[4];
    int i;

    //now encrypted buf is TCP/IP-endian;
    //TCP/IP network byte order (which is big-endian).
    y = ntohl(*((uint32_t*)src));
    z = ntohl(*((uint32_t*)(src + 4)));
    //std::cout << ntohl(0x0a3aea41);

    for (i = 0; i < 4; i++) {
        //key is TCP/IP-endian;
        k[i] = ntohl(*((uint32_t*)(key.data() + i * 4)));
    }

    sum = 0;
    for (i = 0; i < rounds; i++) {
        sum += DELTA;
        y += ((z << 4) + k[0]) ^ (z + sum) ^ ((z >> 5) + k[1]);
        z += ((y << 4) + k[2]) ^ (y + sum) ^ ((y >> 5) + k[3]);
    }

    *((uint32_t*)dst) = ntohl(y);
    *((uint32_t*)(dst + 4)) = ntohl(z);

    //now plain-text is TCP/IP-endian;
}

/*pKey为16byte*/
/*
    输入:nInBufLen为需加密的明文部分(Body)长度;
    输出:返回为加密后的长度(是8byte的倍数);
*/
/*TEA加密算法,CBC模式*/
/*密文格式:PadLen(1byte)+Padding(var,0-7byte)+Salt(2byte)+Body(var byte)+Zero(7byte)*/
int encryptTencentTeaLen(int nInBufLen)
{

    int nPadSaltBodyZeroLen/*PadLen(1byte)+Salt+Body+Zero的长度*/;
    int nPadlen;

    /*根据Body长度计算PadLen,最小必需长度必需为8byte的整数倍*/
    nPadSaltBodyZeroLen = nInBufLen/*Body长度*/ + 1 + SALT_LEN + ZERO_LEN/*PadLen(1byte)+Salt(2byte)+Zero(7byte)*/;
    if ((nPadlen = nPadSaltBodyZeroLen % 8)) /*len=nSaltBodyZeroLen%8*/
    {
        /*模8余0需补0,余1补7,余2补6,...,余7补1*/
        nPadlen = 8 - nPadlen;
    }

    return nPadlen;
}

/*pKey为16byte*/
/*
    输入:pInBuf为需加密的明文部分(Body),nInBufLen为pInBuf长度;
    输出:pOutBuf为密文格式,pOutBufLen为pOutBuf的长度是8byte的倍数;
*/
/*TEA加密算法,CBC模式*/
/*密文格式:PadLen(1byte)+Padding(var,0-7byte)+Salt(2byte)+Body(var byte)+Zero(7byte)*/
bool encryptTencentTea(std::vector<uint8_t> inBuf, std::vector<uint8_t> key, std::vector<uint8_t> &outBuf)
{
    srand(time(0));
    int nPadlen = encryptTencentTeaLen(inBuf.size());
    size_t ivCrypt;
    std::vector<uint8_t> srcBuf;
    srcBuf.resize(8);
    std::vector<uint8_t> ivPlain;
    ivPlain.resize(8);
    int tmpIdx, i, j;

    /*加密第一块数据(8byte),取前面10byte*/
    srcBuf[0] = (((char)rand()) & 0x0f8)/*最低三位存PadLen,清零*/ | (char)nPadlen;
    tmpIdx = 1; /*tmpIdx指向srcBuf下一个位置*/

    while (nPadlen--) srcBuf[tmpIdx++] = (char)rand(); /*Padding*/

    /*come here, tmpIdx must <= 8*/

    for (i = 0; i < 8; i++) ivPlain[i] = 0;
    ivCrypt = 0;//ivPlain /*make zero iv*/

    auto outBufPos = 0; /*init outBufPos*/

#define cryptBlock {\
        /*tmpIdx==8*/\
        outBuf.resize(outBuf.size() + 8);\
        for (j = 0; j < 8; j++) /*加密前异或前8个byte的密文(iv_crypt指向的)*/\
            srcBuf[j] ^= outBuf[j + ivCrypt];\
        /*pOutBuffer、pInBuffer均为8byte, pKey为16byte*/\
        /*加密*/\
        TeaEncryptECB(srcBuf.data(), outBuf.data()+outBufPos, key, 16);\
        for (j = 0; j < 8; j++) /*加密后异或前8个byte的明文(iv_plain指向的)*/\
            outBuf[j + outBufPos] ^= ivPlain[j];\
        /*保存当前的iv_plain*/\
        for (j = 0; j < 8; j++) ivPlain[j] = srcBuf[j];\
        /*更新iv_crypt*/\
        tmpIdx = 0;\
        ivCrypt = outBufPos;\
        outBufPos += 8;\
    }


    for (i = 1; i <= SALT_LEN;) /*Salt(2byte)*/
    {
        if (tmpIdx < 8)
        {
            srcBuf[tmpIdx++] = (char)rand();
            i++; /*i inc in here*/
        }
        if (tmpIdx == 8)
        {
            cryptBlock
        }
    }

    /*tmpIdx指向srcBuf下一个位置*/

    auto inBufPos = 0;
    while (inBufPos < inBuf.size())
    {
        if (tmpIdx < 8)
        {
            srcBuf[tmpIdx++] = inBuf[inBufPos];
            inBufPos++;
        }
        if (tmpIdx == 8)
        {
            cryptBlock
        }
    }

    /*tmpIdx指向srcBuf下一个位置*/

    for (i = 1; i <= ZERO_LEN;)
    {
        if (tmpIdx < 8)
        {
            srcBuf[tmpIdx++] = 0;
            i++; //i inc in here
        }
        if (tmpIdx == 8)
        {
            cryptBlock
        }
    }
    return true;
#undef cryptBlock
}

bool decryptTencentTea(std::vector<uint8_t> inBuf, std::vector<uint8_t> key, std::vector<uint8_t> &out) {
    if (inBuf.size() % 8 != 0) {
        return false;
        //inBuf size not a multiple of the block size
    }
    if (inBuf.size() < 16) {
        return false;
        //inBuf size too small
    }
    
    std::vector<uint8_t> tmpBuf;
    tmpBuf.resize(8);
    
    TeaDecryptECB(inBuf.data(), tmpBuf.data(), key, 16);
    
    auto nPadLen = tmpBuf[0] & 0x7; //只要最低三位
    /*密文格式:PadLen(1byte)+Padding(var,0-7byte)+Salt(2byte)+Body(var byte)+Zero(7byte)*/
    auto outLen = inBuf.size() - 1 /*PadLen*/ - nPadLen - SALT_LEN - ZERO_LEN;
    std::vector<uint8_t> outBuf;
    outBuf.resize(outLen);
    
    std::vector<uint8_t> ivPrev;
    ivPrev.resize(8);
    std::vector<uint8_t> ivCur;
    ivCur.resize(8);
    for (size_t i = 0; i < 8; i++)
    {
        ivCur[i] = inBuf[i]; // init iv
    }
    auto inBufPos = 8;
    
    // 跳过 Padding Len 和 Padding
    auto tmpIdx = 1 + nPadLen;
    
    // CBC IV 处理
#define cryptBlock {\
    ivPrev = ivCur;\
    for (size_t k = inBufPos; k < inBufPos + 8; k++)\
    {\
        ivCur[k - inBufPos] = inBuf[k];\
    }\
    for (size_t j = 0; j < 8; j++) {\
        tmpBuf[j] ^= ivCur[j];\
    }\
    TeaDecryptECB(tmpBuf.data(), tmpBuf.data(), key, 16);\
    inBufPos += 8;\
    tmpIdx = 0;\
    }
    
    // 跳过 Salt
    for (size_t i = 1; i <= SALT_LEN; ) {
        if (tmpIdx < 8) {
            tmpIdx++;
            i++;
        }
        else {
            cryptBlock
        }
    }
    
    // 还原明文
    auto outBufPos = 0;
    while (outBufPos < outLen) {
        if (tmpIdx < 8) {
            outBuf[outBufPos] = tmpBuf[tmpIdx] ^ ivPrev[tmpIdx];
            outBufPos++;
            tmpIdx++;
        }
        else {
            cryptBlock
        }
    }
    
    // 校验Zero
    for (size_t i = 1; i <= ZERO_LEN; i++) {
        if (tmpBuf[i] != ivPrev[i]) {
            return false;
            //zero check failed
        }
    }
    out = outBuf;
    return true;
#undef cryptBlock
}

#endif //QQMUSIC_CPP_TENCENTTEA_HPP
