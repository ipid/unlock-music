#include <cstdint>
#include <vector>
class QmcStaticCipher {
private:
    uint8_t staticCipherBox[256] = {
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
    0xA5, 0x47, 0xF7, 0xF6, 0x00, 0x79, 0x4A, 0x11  //0xF8
    };

    uint8_t getMask(size_t offset) {
        if (offset > 0x7fff) offset %= 0x7fff;
        return staticCipherBox[(offset * offset + 27) & 0xff];
    }

public:
    void proc(std::vector<uint8_t>& buf, size_t offset) {
        for (size_t i = 0; i < buf.size(); i++) {
            buf[i] ^= getMask(offset + i);
        }
    }
};

class QmcMapCipher {
private:
    std::vector<uint8_t> key;

    uint8_t rotate(uint8_t value, size_t bits) {
        auto rotate = (bits + 4) % 8;
        auto left = value << rotate;
        auto right = value >> rotate;
        return (left | right) & 0xff;
    }

    uint8_t getMask(size_t offset) {
        if (offset > 0x7fff) offset %= 0x7fff;

        const auto idx = (offset * offset + 71214) % key.size();
        return rotate(key[idx], idx & 0x7);
    }

public:
    QmcMapCipher(std::vector<uint8_t> &argKey, short operation) {
        if (operation == 2)
        {
            if (argKey.size() == 0) {
                return;
            }
        }
        else if (operation == 1)
        {
            const char WordList[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            srand(time(0));
            uint32_t number = 0;
            while (number > 300 || number == 0)
            {
                number = rand();
            }
            argKey.resize(number);
            for (int i = 0; i < argKey.size(); i++) {
                number = rand();
                argKey[i] = WordList[number % 62];
            }
        }
        else
        {
            return;
        }

        key = argKey;
    }

    void proc(std::vector<uint8_t>& buf, size_t offset) {
        for (size_t i = 0; i < buf.size(); i++) {
            buf[i] ^= getMask(offset + i);
        }
    }
};

class QmcRC4Cipher {
public:
    void proc(std::vector<uint8_t>& buf, size_t offset) {
        // Macro: common code after each process
#define postProcess(len)            \
        {                           \
            toProcess -= len;       \
            processed += len;       \
            offset += len;          \
            /* no more data */      \
            if (toProcess == 0) {   \
                return;             \
            }                       \
        }

        size_t toProcess = buf.size();
        size_t processed = 0;
        std::vector<uint8_t> tmpbuf;

        // 前 128 字节使用不同的解密方案
        if (offset < FIRST_SEGMENT_SIZE) {
            size_t len_segment = std::min(FIRST_SEGMENT_SIZE - offset, buf.size());
            tmpbuf.resize(len_segment);
            for (size_t i = 0; i < len_segment; i++)
            {
                tmpbuf[i] = buf[processed + i];
            }
            procFirstSegment(tmpbuf, offset);
            for (size_t i = 0; i < len_segment; i++)
            {
                buf[processed + i] = tmpbuf[i];
            }
            postProcess(len_segment);
        }


        // 区块对齐
        if (offset % SEGMENT_SIZE != 0) {
            size_t len_segment = std::min(SEGMENT_SIZE - (offset % SEGMENT_SIZE), toProcess);
            tmpbuf.resize(len_segment);
            for (size_t i = 0; i < len_segment; i++)
            {
                tmpbuf[i] = buf[processed + i];
            }
            procASegment(tmpbuf, offset);
            for (size_t i = 0; i < len_segment; i++)
            {
                buf[processed + i] = tmpbuf[i];
            }
            postProcess(len_segment);
        }

        // 对每个区块逐一进行解密
        while (toProcess > SEGMENT_SIZE) {
            tmpbuf.resize(SEGMENT_SIZE);
            for (size_t i = 0; i < SEGMENT_SIZE; i++)
            {
                tmpbuf[i] = buf[processed + i];
            }
            procASegment(tmpbuf, offset);
            for (size_t i = 0; i < SEGMENT_SIZE; i++)
            {
                buf[processed + i] = tmpbuf[i];
            }
            postProcess(SEGMENT_SIZE);
        }

        if (toProcess > 0) {
            tmpbuf.resize(toProcess);
            for (size_t i = 0; i < toProcess; i++)
            {
                tmpbuf[i] = buf[processed + i];
            }
            procASegment(tmpbuf, offset);
            for (size_t i = 0; i < toProcess; i++)
            {
                buf[processed + i] = tmpbuf[i];
            }
        }

#undef postProcess
    }

    QmcRC4Cipher(std::vector<uint8_t>& argKey, short operation) {
        if (operation == 2)
        {
            if (argKey.size() == 0) {
                return;
            }
        }
        else if (operation == 1)
        {
            const char WordList[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            srand(time(0));
            uint32_t number = 0;
            while (number <= 300 || number >= 512)
            {
                number = rand();
            }
            argKey.resize(number);
            for (int i = 0; i < argKey.size(); i++) {
                number = rand();
                argKey[i] = WordList[number % 62];
            }
        }
        else
        {
            return;
        }

        key = argKey;

        // init seed box
        S.resize(key.size());
        for (size_t i = 0; i < key.size(); ++i) {
            S[i] = i & 0xff;
        }
        size_t j = 0;
        for (size_t i = 0; i < key.size(); ++i) {
            j = (S[i] + j + key[i % key.size()]) % key.size();
            std::swap(S[i], S[j]);
        }

        // init hash base
        hash = 1;
        for (size_t i = 0; i < key.size(); i++) {
            uint8_t value = key[i];

            // ignore if key char is '\x00'
            if (!value) continue;

            auto next_hash = hash * value;
            if (next_hash == 0 || next_hash <= hash) break;

            hash = next_hash;
        }
    }

private:
    const size_t FIRST_SEGMENT_SIZE = 0x80;
    const size_t SEGMENT_SIZE = 5120;

    std::vector<uint8_t> S;
    std::vector<uint8_t> key;
    uint32_t hash = 1;

    void procFirstSegment(std::vector<uint8_t>& buf, size_t offset) {
        for (size_t i = 0; i < buf.size(); i++) {
            buf[i] ^= key[getSegmentKey(offset + i)];
        }
    }

    void procASegment(std::vector<uint8_t>& buf, size_t offset) {
        // Initialise a new seed box
        std::vector<uint8_t> nS;
        nS = S;

        // Calculate the number of bytes to skip.
        // The initial "key" derived from segment id, plus the current offset.
        int64_t skipLen = (offset % SEGMENT_SIZE) + getSegmentKey(int(offset / SEGMENT_SIZE));

        // decrypt the block
        size_t j = 0;
        size_t k = 0;
        int i = -skipLen;
        for (; i < (int)buf.size(); i++) {
            j = (j + 1) % key.size();
            k = (nS[j] + k) % key.size();
            std::swap(nS[k], nS[j]);

            if (i >= 0) {
                buf[i] ^= nS[(nS[j] + nS[k]) % key.size()];
            }
        }
    }

    uint64_t getSegmentKey(int id) {
        auto seed = key[id % key.size()];
        uint64_t idx = ((double)hash / ((id + 1) * seed)) * 100.0;
        return idx % key.size();
    }
};
