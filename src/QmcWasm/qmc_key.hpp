#include"TencentTea.hpp"
#include "base64.hpp"

void simpleMakeKey(uint8_t salt, int length, std::vector<uint8_t> &key_buf) {
    for (size_t i = 0; i < length; ++i) {
        double tmp = tan((float)salt + (double)i * 0.1);
        key_buf[i] = 0xFF & (uint8_t)(fabs(tmp) * 100.0);
    }
}

std::vector<uint8_t> v2KeyPrefix = { 0x51, 0x51, 0x4D, 0x75, 0x73, 0x69, 0x63, 0x20, 0x45, 0x6E, 0x63, 0x56, 0x32, 0x2C, 0x4B, 0x65, 0x79, 0x3A };

bool decryptV2Key(std::vector<uint8_t> key, std::vector<uint8_t>& outVec)
{
    if (v2KeyPrefix.size() > key.size())
    {
        return true;
    }
    for (size_t i = 0; i < v2KeyPrefix.size(); i++)
    {
        if (key[i] != v2KeyPrefix[i])
        {
            return true;
        }
    }

    std::vector<uint8_t> mixKey1 = { 0x33, 0x38, 0x36, 0x5A, 0x4A, 0x59, 0x21, 0x40, 0x23, 0x2A, 0x24, 0x25, 0x5E, 0x26, 0x29, 0x28 };
    std::vector<uint8_t> mixKey2 = { 0x2A, 0x2A, 0x23, 0x21, 0x28, 0x23, 0x24, 0x25, 0x26, 0x5E, 0x61, 0x31, 0x63, 0x5A, 0x2C, 0x54 };

    std::vector<uint8_t> out;
    std::vector<uint8_t> tmpKey;
    tmpKey.resize(key.size() - 18);
    for (size_t i = 0; i < tmpKey.size(); i++)
    {
        tmpKey[i] = key[18 + i];
    }
    if (!decryptTencentTea(tmpKey, mixKey1, out))
    {
        outVec.resize(0);
        //EncV2 key decode failed.
        return false;
    }

    tmpKey.resize(out.size());
    for (size_t i = 0; i < tmpKey.size(); i++)
    {
        tmpKey[i] = out[i];
    }
    out.resize(0);
    if (!decryptTencentTea(tmpKey, mixKey2, out))
    {
        outVec.resize(0);
        //EncV2 key decode failed.
        return false;
    }

    outVec.resize(base64::decoded_size(out.size()));
    auto n = base64::decode(outVec.data(), (const char*)(out.data()), out.size()).first;

    if (n < 16)
    {
        outVec.resize(0);
        //EncV2 key size is too small.
        return false;
    }
    outVec.resize(n);

    return true;
}

bool encryptV2Key(std::vector<uint8_t> key, std::vector<uint8_t>& outVec)
{
    if (key.size() < 16)
    {
        outVec.resize(0);
        //EncV2 key size is too small.
        return false;
    }

    std::vector<uint8_t> in;
    in.resize(base64::encoded_size(key.size()));
    auto n = base64::encode(in.data(), (const char*)(key.data()), key.size());
    in.resize(n);

    std::vector<uint8_t> mixKey1 = { 0x33, 0x38, 0x36, 0x5A, 0x4A, 0x59, 0x21, 0x40, 0x23, 0x2A, 0x24, 0x25, 0x5E, 0x26, 0x29, 0x28 };
    std::vector<uint8_t> mixKey2 = { 0x2A, 0x2A, 0x23, 0x21, 0x28, 0x23, 0x24, 0x25, 0x26, 0x5E, 0x61, 0x31, 0x63, 0x5A, 0x2C, 0x54 };

    std::vector<uint8_t> tmpKey;
    if (!encryptTencentTea(in, mixKey2, tmpKey))
    {
        outVec.resize(0);
        //EncV2 key decode failed.
        return false;
    }
    in.resize(tmpKey.size());
    for (size_t i = 0; i < tmpKey.size(); i++)
    {
        in[i] = tmpKey[i];
    }
    tmpKey.resize(0);

    if (!encryptTencentTea(in, mixKey1, tmpKey))
    {
        outVec.resize(0);
        //EncV2 key decode failed.
        return false;
    }
    outVec.resize(tmpKey.size() + 18);
    for (size_t i = 0; i < tmpKey.size(); i++)
    {
        outVec[18 + i] = tmpKey[i];
    }

    for (size_t i = 0; i < v2KeyPrefix.size(); i++)
    {
        outVec[i] = v2KeyPrefix[i];
    }

    return true;
}

bool QmcDecryptKey(std::vector<uint8_t> raw, std::vector<uint8_t> &outVec) {
    std::vector<uint8_t> rawDec;
    rawDec.resize(base64::decoded_size(raw.size()));
    auto n = base64::decode(rawDec.data(), (const char*)(raw.data()), raw.size()).first;
    if (n < 16) {
        return false;
        //key length is too short
    }
    rawDec.resize(n);

    std::vector<uint8_t> tmpIn = rawDec;
    if (!decryptV2Key(tmpIn, rawDec))
    {
        //decrypt EncV2 failed.
        return false;
    }

    std::vector<uint8_t> simpleKey;
    simpleKey.resize(8);
    simpleMakeKey(106, 8, simpleKey);
    std::vector<uint8_t> teaKey;
    teaKey.resize(16);
    for (size_t i = 0; i < 8; i++) {
        teaKey[i << 1] = simpleKey[i];
        teaKey[(i << 1) + 1] = rawDec[i];
    }
    std::vector<uint8_t> out;
    std::vector<uint8_t> tmpRaw;
    tmpRaw.resize(rawDec.size() - 8);
    for (size_t i = 0; i < tmpRaw.size(); i++)
    {
        tmpRaw[i] = rawDec[8 + i];
    }
    if (decryptTencentTea(tmpRaw, teaKey, out))
    {
        rawDec.resize(8 + out.size());
        for (size_t i = 0; i < out.size(); i++)
        {
            rawDec[8 + i] = out[i];
        }
        outVec = rawDec;
        return true;
    }
    else
    {
        return false;
    }
}

bool QmcEncryptKey(std::vector<uint8_t> raw, std::vector<uint8_t>& outVec, bool useEncV2 = true) {
    std::vector<uint8_t> simpleKey;
    simpleKey.resize(8);
    simpleMakeKey(106, 8, simpleKey);
    std::vector<uint8_t> teaKey;
    teaKey.resize(16);
    for (size_t i = 0; i < 8; i++) {
        teaKey[i << 1] = simpleKey[i];
        teaKey[(i << 1) + 1] = raw[i];
    }
    std::vector<uint8_t> out;
    out.resize(raw.size() - 8);
    for (size_t i = 0; i < out.size(); i++)
    {
        out[i] = raw[8 + i];
    }
    std::vector<uint8_t> tmpRaw;
    if (encryptTencentTea(out, teaKey, tmpRaw))
    {
        raw.resize(tmpRaw.size() + 8);
        for (size_t i = 0; i < tmpRaw.size(); i++)
        {
            raw[i + 8] = tmpRaw[i];
        }

        if (useEncV2)
        {
            std::vector<uint8_t> tmpIn = raw;
            if (!encryptV2Key(tmpIn, raw))
            {
                //encrypt EncV2 failed.
                return false;
            }
        }

        std::vector<uint8_t> rawEnc;
        rawEnc.resize(base64::encoded_size(raw.size()));
        auto n = base64::encode(rawEnc.data(), (const char*)(raw.data()), raw.size());
        rawEnc.resize(n);
        outVec = rawEnc;
        return true;
    }
    else
    {
        return false;
    }
}
