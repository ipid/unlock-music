// QmcWasm.cpp : Defines the entry point for the application.
//

#include "QmcWasm.h"

#include "qmc.hpp"

#include <stddef.h>
#include <string.h>

std::string err = "";
std::string sid = "";
QmcDecode e;

int preDec(uintptr_t blob, size_t blobSize, std::string ext)
{
    if (!e.SetBlob((uint8_t*)blob, blobSize))
    {
        err = "cannot allocate memory";
        return -1;
    }
    int tailSize = e.PreDecode(ext);
    if (e.error != "")
    {
        err = e.error;
        return -1;
    }
    sid = e.songId;
    return tailSize;
}

size_t decBlob(uintptr_t blob, size_t blobSize, size_t offset)
{
    if (!e.SetBlob((uint8_t*)blob, blobSize))
    {
        err = "cannot allocate memory";
        return 0;
    }
    std::vector<uint8_t> decData = e.Decode(offset);
    if (e.error != "")
    {
        err = e.error;
        return 0;
    }
    memcpy((uint8_t*)blob, decData.data(), decData.size());
    return decData.size();
}

std::string getErr()
{
  return err;
}

std::string getSongId()
{
    return sid;
}
