#include <string.h>
#include <cmath>
#include <vector>
#include <arpa/inet.h>
#include "qmc_key.hpp"
#include "qmc_cipher.hpp"

class QmcDecode {
private:
    std::vector<uint8_t> blobData;

    std::vector<uint8_t> rawKeyBuf;
    std::string cipherType = "";

    size_t dataOffset = 0;
    size_t keySize = 0;
    int mediaVer = 0;

    std::string checkType(std::string fn) {
        if (fn.find(".qmc") < fn.size() || fn.find(".m") < fn.size())
        {
            std::string buf_tag = "";
            for (int i = 4; i > 0; --i)
            {
                buf_tag += *((char*)blobData.data() + blobData.size() - i);
            }
            if (buf_tag == "QTag")
            {
                keySize = ntohl(*(uint32_t*)(blobData.data() + blobData.size() - 8));
                return "QTag";
            }
            else if (buf_tag == "STag")
            {
               return "STag";
            }
            else
            {
                keySize = (*(uint32_t*)(blobData.data() + blobData.size() - 4));
                if (keySize < 0x400)
                {
                    return "Map/RC4";
                }
                else
                {
                    keySize = 0;
                    return "Static";
                }
            }
        }
        else if (fn.find(".cache") < fn.size())
        {
            return "cache";
        }
        else if (fn.find(".tm") < fn.size())
        {
            return "ios";
        }
        else
        {
            return "invalid";
        }
    }

    bool parseRawKeyQTag() {
        std::string ketStr = "";
        std::string::size_type index = 0;
        ketStr.append((char*)rawKeyBuf.data(), rawKeyBuf.size());
        index = ketStr.find(",", 0);
        if (index != std::string::npos)
        {
            rawKeyBuf.resize(index);
        }
        else
        {
            return false;
        }
        ketStr = ketStr.substr(index + 1);
        index = ketStr.find(",", 0);
        if (index != std::string::npos)
        {
            this->songId = ketStr.substr(0, index);
        }
        else
        {
            return false;
        }
        ketStr = ketStr.substr(index + 1);
        index = ketStr.find(",", 0);
        if (index == std::string::npos)
        {
            this->mediaVer = std::stoi(ketStr);
        }
        else
        {
            return false;
        }
        return true;
    }

    bool readRawKey(size_t tailSize) {
        // get raw key data length
        rawKeyBuf.resize(keySize);
        if (rawKeyBuf.size() != keySize) {
            return false;
        }
        for (size_t i = 0; i < keySize; i++)
        {
            rawKeyBuf[i] = blobData[i + blobData.size() - (tailSize + keySize)];
        }
        return true;
    }

    void DecodeStatic();

    void DecodeMapRC4();

    void DecodeCache();

    void DecodeTm();

public:
    bool SetBlob(uint8_t* blob, size_t blobSize) {
        blobData.resize(blobSize);
        if (blobData.size() != blobSize) {
            return false;
        }
        memcpy(blobData.data(), blob, blobSize);
        return true;
    }
    
    int PreDecode(std::string ext) {
        cipherType = checkType(ext);
        size_t tailSize = 0;
        if (cipherType == "invalid" || cipherType == "STag") {
            error = "file is invalid or not supported (Please downgrade your app).";
            return -1;
        }
        if (cipherType == "QTag") {
            tailSize = 8;
        }
        else if (cipherType == "Map/RC4") {
            tailSize = 4;
        }
        if (keySize > 0) {
            if (!readRawKey(tailSize)) {
                error = "cannot read embedded key from file";
                return -1;
            }
            if (tailSize == 8) {
                cipherType = "Map/RC4";
                if (!parseRawKeyQTag()) {
                    error = "cannot parse embedded key";
                    return -1;
                }
            }
            std::vector<uint8_t> tmp;
            if (!QmcDecryptKey(rawKeyBuf, tmp)) {
                error = "cannot decrypt embedded key";
                return -1;
            }
            rawKeyBuf = tmp;
        }
        return keySize + tailSize;
    }

    std::vector<uint8_t> Decode(size_t offset);

    std::string songId = "";
    std::string error = "";
};

void QmcDecode::DecodeStatic()
{
    QmcStaticCipher sc;
    sc.proc(blobData, dataOffset);
}

void QmcDecode::DecodeMapRC4() {
    if (rawKeyBuf.size() > 300)
    {
        QmcRC4Cipher c(rawKeyBuf, 2);
        c.proc(blobData, dataOffset);
    }
    else
    {
        QmcMapCipher c(rawKeyBuf, 2);
        c.proc(blobData, dataOffset);
    }
}

void QmcDecode::DecodeCache()
{
    for (size_t i = 0; i < blobData.size(); i++) {
        blobData[i] ^= 0xf4;
        blobData[i] = ((blobData[i] & 0b00111111) << 2) | (blobData[i] >> 6); // rol 2
    }
}

void QmcDecode::DecodeTm()
{
    uint8_t const TM_HEADER[] = { 0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70 };
    for (size_t cur = dataOffset, i = 0; cur < 8 && i < blobData.size(); ++cur, ++i) {
        blobData[i] = TM_HEADER[dataOffset];
    }
}

std::vector<uint8_t> QmcDecode::Decode(size_t offset)
{
    dataOffset = offset;
    if (cipherType == "Map/RC4")
    {
        DecodeMapRC4();
    }
    else if (cipherType == "Static")
    {
        DecodeStatic();
    }
    else if (cipherType == "cache")
    {
        DecodeCache();
    }
    else if (cipherType == "ios")
    {
        DecodeTm();
    }
    else {
        error = "File is invalid or encryption type is not supported.";
    }
    return blobData;
}
