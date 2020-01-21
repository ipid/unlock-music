const rawDecrypt = require("./raw");
const util = require("./util");
export {Decrypt}
const header = [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70];

async function Decrypt(file, raw_filename) {
    const fileBuffer = await util.GetArrayBuffer(file);
    const audioData = new Uint8Array(fileBuffer);
    for (let cur = 0; cur < 8; ++cur) {
        audioData[cur] = header[cur];
    }
    const musicData = new Blob([audioData], {type: "audio/mp4"});
    return await rawDecrypt.Decrypt(musicData, raw_filename, "m4a")
}
