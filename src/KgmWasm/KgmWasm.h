// KgmWasm.h : Include file for standard system include files,
// or project specific include files.

#pragma once

#include <emscripten/bind.h>
#include <string>

namespace em = emscripten;

size_t preDec(uintptr_t blob, size_t blobSize, std::string ext);
void decBlob(uintptr_t blob, size_t blobSize, size_t offset);

EMSCRIPTEN_BINDINGS(QmcCrypto)
{
  em::function("preDec", &preDec, em::allow_raw_pointers());
  em::function("decBlob", &decBlob, em::allow_raw_pointers());
}
