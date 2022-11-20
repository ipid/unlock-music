// KgmWasm.cpp : Defines the entry point for the application.
//

#include "KgmWasm.h"

#include "kgm.hpp"

#include <stddef.h>
#include <string.h>

size_t preDec(uintptr_t blob, size_t blobSize, std::string ext)
{
    return PreDec((uint8_t*)blob, blobSize, ext == "vpr");
}

void decBlob(uintptr_t blob, size_t blobSize, size_t offset)
{
    Decrypt((uint8_t*)blob, blobSize, offset);
    return;
}
