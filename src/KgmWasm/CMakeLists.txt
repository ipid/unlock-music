# CMakeList.txt : CMake project for KgmWasm, include source and define
# project specific logic here.
#
cmake_minimum_required (VERSION 3.8)

project ("KgmWasm")

set(CMAKE_CXX_STANDARD 14)

include_directories(
	$<TARGET_PROPERTY:INTERFACE_INCLUDE_DIRECTORIES>
)

# Add source to this project's executable.
set(RUNTIME_METHODS_LIST
	getValue
	writeArrayToMemory
	UTF8ToString
)
list(JOIN RUNTIME_METHODS_LIST "," RUNTIME_METHODS)

set(EMSCRIPTEN_FLAGS
	"--bind"
	"-s NO_DYNAMIC_EXECUTION=1"
	"-s MODULARIZE=1"
	"-s EXPORT_NAME=KgmCryptoModule"
	"-s EXPORTED_RUNTIME_METHODS=${RUNTIME_METHODS}"
)
set(EMSCRIPTEN_LEGACY_FLAGS
	${EMSCRIPTEN_FLAGS}
	"-s WASM=0"
	"--memory-init-file 0"
)
set(EMSCRIPTEN_WASM_BUNDLE_FLAGS
	${EMSCRIPTEN_FLAGS}
	"-s SINGLE_FILE=1"
)

list(JOIN EMSCRIPTEN_FLAGS             " " EMSCRIPTEN_FLAGS_STR)
list(JOIN EMSCRIPTEN_LEGACY_FLAGS      " " EMSCRIPTEN_LEGACY_FLAGS_STR)
list(JOIN EMSCRIPTEN_WASM_BUNDLE_FLAGS " " EMSCRIPTEN_WASM_BUNDLE_FLAGS_STR)

# Define projects config
set(WASM_SOURCES
	"KgmWasm.cpp"
)

add_executable(KgmWasm ${WASM_SOURCES})
set_target_properties(
	KgmWasm
	PROPERTIES LINK_FLAGS ${EMSCRIPTEN_FLAGS_STR}
)

add_executable(KgmWasmBundle ${WASM_SOURCES})
set_target_properties(
	KgmWasmBundle
	PROPERTIES LINK_FLAGS ${EMSCRIPTEN_WASM_BUNDLE_FLAGS_STR}
)

add_executable(KgmLegacy ${WASM_SOURCES})
set_target_properties(
	KgmLegacy
	PROPERTIES LINK_FLAGS ${EMSCRIPTEN_LEGACY_FLAGS_STR}
)

