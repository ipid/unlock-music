#!/usr/bin/env bash

set -ex

cd "$(git rev-parse --show-toplevel)"

pushd ./src/QmcWasm
bash build-wasm
popd

pushd ./src/KgmWasm
bash build-wasm
popd
