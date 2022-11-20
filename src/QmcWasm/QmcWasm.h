// QmcWasm.h : Include file for standard system include files,
// or project specific include files.

#pragma once

#include <emscripten/bind.h>
#include <string>

namespace em = emscripten;

int preDec(uintptr_t blob, size_t blobSize, std::string ext);
size_t decBlob(uintptr_t blob, size_t blobSize, size_t offset);
std::string getErr();
std::string getSongId();

EMSCRIPTEN_BINDINGS(QmcCrypto)
{
  em::function("getErr", &getErr);
  em::function("getSongId", &getSongId);

  em::function("preDec", &preDec, em::allow_raw_pointers());
  em::function("decBlob", &decBlob, em::allow_raw_pointers());
}
