# CMakeList.txt : CMake project for QmcWasm, include source and define
# project specific logic here.
#
cmake_minimum_required (VERSION 3.8)

project ("QmcWasm")

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
	"-s EXPORT_NAME=QmcCryptoModule"
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
	"QmcWasm.cpp"
)

add_executable(QmcWasm ${WASM_SOURCES})
set_target_properties(
	QmcWasm
	PROPERTIES LINK_FLAGS ${EMSCRIPTEN_FLAGS_STR}
)

add_executable(QmcWasmBundle ${WASM_SOURCES})
set_target_properties(
	QmcWasmBundle
	PROPERTIES LINK_FLAGS ${EMSCRIPTEN_WASM_BUNDLE_FLAGS_STR}
)

add_executable(QmcLegacy ${WASM_SOURCES})
set_target_properties(
	QmcLegacy
	PROPERTIES LINK_FLAGS ${EMSCRIPTEN_LEGACY_FLAGS_STR}
)

