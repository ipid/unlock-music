import {QmcMapCipher, QmcStaticCipher} from "@/decrypt/qmc_cipher";
import fs from 'fs'

test("static cipher [0x7ff8,0x8000) ", () => {
  const expected = new Uint8Array([
    0xD8, 0x52, 0xF7, 0x67, 0x90, 0xCA, 0xD6, 0x4A,
    0x4A, 0xD6, 0xCA, 0x90, 0x67, 0xF7, 0x52, 0xD8,
  ])

  const c = new QmcStaticCipher()
  const buf = new Uint8Array(16)
  c.decrypt(buf, 0x7ff8)

  expect(buf).toStrictEqual(expected)
})

test("static cipher [0,0x10) ", () => {
  const expected = new Uint8Array([
    0xC3, 0x4A, 0xD6, 0xCA, 0x90, 0x67, 0xF7, 0x52,
    0xD8, 0xA1, 0x66, 0x62, 0x9F, 0x5B, 0x09, 0x00,
  ])

  const c = new QmcStaticCipher()
  const buf = new Uint8Array(16)
  c.decrypt(buf, 0)

  expect(buf).toStrictEqual(expected)
})

function loadTestDataMapCipher(name: string): {
  key: Uint8Array,
  cipherText: Uint8Array,
  clearText: Uint8Array
} {
  return {
    key: fs.readFileSync(`testdata/${name}_key.bin`),
    cipherText: fs.readFileSync(`testdata/${name}_raw.bin`),
    clearText: fs.readFileSync(`testdata/${name}_target.bin`)
  }
}

test("map cipher: get mask", () => {
  const expected = new Uint8Array([
    0xBB, 0x7D, 0x80, 0xBE, 0xFF, 0x38, 0x81, 0xFB,
    0xBB, 0xFF, 0x82, 0x3C, 0xFF, 0xBA, 0x83, 0x79,
  ])
  const key = new Uint8Array(256)
  for (let i = 0; i < 256; i++) key[i] = i
  const buf = new Uint8Array(16)

  const c = new QmcMapCipher(key)
  c.decrypt(buf, 0)
  expect(buf).toStrictEqual(expected)
})

test("map cipher: real file", async () => {
  const cases = ["mflac_map", "mgg_map"]
  for (const name of cases) {
    const {key, clearText, cipherText} = loadTestDataMapCipher(name)
    const c = new QmcMapCipher(key)

    c.decrypt(cipherText, 0)

    expect(cipherText).toStrictEqual(clearText)
  }
})
