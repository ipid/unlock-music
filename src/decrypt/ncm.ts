import {
    AudioMimeType,
    BytesHasPrefix,
    GetArrayBuffer,
    GetImageFromURL,
    GetMetaFromFile, IMusicMeta,
    SniffAudioExt,
    WriteMetaToFlac,
    WriteMetaToMp3
} from "@/decrypt/utils.ts";
import {parseBlob as metaParseBlob} from "music-metadata-browser";
import jimp from 'jimp';

import CryptoJS from "crypto-js";
import {DecryptResult} from "@/decrypt/entity";

const CORE_KEY = CryptoJS.enc.Hex.parse("687a4852416d736f356b496e62617857");
const META_KEY = CryptoJS.enc.Hex.parse("2331346C6A6B5F215C5D2630553C2728");
const MagicHeader = [0x43, 0x54, 0x45, 0x4E, 0x46, 0x44, 0x41, 0x4D];


export async function Decrypt(file: File, raw_filename: string, _: string): Promise<DecryptResult> {
    return (new NcmDecrypt(await GetArrayBuffer(file), raw_filename)).decrypt()
}


interface NcmMusicMeta {
    //musicId: number
    musicName?: string
    artist?: Array<string | number>[]
    format?: string
    album?: string
    albumPic?: string
}

interface NcmDjMeta {
    mainMusic: NcmMusicMeta
}


class NcmDecrypt {
    raw: ArrayBuffer
    view: DataView
    offset: number = 0
    filename: string
    format: string = ""
    mime: string = ""
    audio?: Uint8Array
    blob?: Blob
    oriMeta?: NcmMusicMeta
    newMeta?: IMusicMeta
    image?: { mime: string, buffer: ArrayBuffer, url: string }

    constructor(buf: ArrayBuffer, filename: string) {
        const prefix = new Uint8Array(buf, 0, 8)
        if (!BytesHasPrefix(prefix, MagicHeader)) throw Error("此ncm文件已损坏")
        this.offset = 10
        this.raw = buf
        this.view = new DataView(buf)
        this.filename = filename
    }

    _getKeyData(): Uint8Array {
        const keyLen = this.view.getUint32(this.offset, true);
        this.offset += 4;
        const cipherText = new Uint8Array(this.raw, this.offset, keyLen)
            .map(uint8 => uint8 ^ 0x64);
        this.offset += keyLen;

        const plainText = CryptoJS.AES.decrypt(
            // @ts-ignore
            {ciphertext: CryptoJS.lib.WordArray.create(cipherText)},
            CORE_KEY,
            {mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7}
        );

        const result = new Uint8Array(plainText.sigBytes);

        const words = plainText.words;
        const sigBytes = plainText.sigBytes;
        for (let i = 0; i < sigBytes; i++) {
            result[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }

        return result.slice(17)
    }

    _getKeyBox(): Uint8Array {
        const keyData = this._getKeyData()
        const box = new Uint8Array(Array(256).keys());

        const keyDataLen = keyData.length;

        let j = 0;

        for (let i = 0; i < 256; i++) {
            j = (box[i] + j + keyData[i % keyDataLen]) & 0xff;
            [box[i], box[j]] = [box[j], box[i]];
        }

        return box.map((_, i, arr) => {
            i = (i + 1) & 0xff;
            const si = arr[i];
            const sj = arr[(i + si) & 0xff];
            return arr[(si + sj) & 0xff];
        });
    }

    _getMetaData(): NcmMusicMeta {
        const metaDataLen = this.view.getUint32(this.offset, true);
        this.offset += 4;
        if (metaDataLen === 0) return {};

        const cipherText = new Uint8Array(this.raw, this.offset, metaDataLen)
            .map(data => data ^ 0x63);
        this.offset += metaDataLen;

        const plainText = CryptoJS.AES.decrypt(
            //@ts-ignore
            {
                ciphertext: CryptoJS.enc.Base64.parse(
                    //@ts-ignore
                    CryptoJS.lib.WordArray.create(cipherText.slice(22)).toString(CryptoJS.enc.Utf8)
                )
            },
            META_KEY,
            {mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7}
        ).toString(CryptoJS.enc.Utf8);

        const labelIndex = plainText.indexOf(":");
        let result: NcmMusicMeta;
        if (plainText.slice(0, labelIndex) === "dj") {
            const tmp: NcmDjMeta = JSON.parse(plainText.slice(labelIndex + 1));
            result = tmp.mainMusic;
        } else {
            result = JSON.parse(plainText.slice(labelIndex + 1));
        }
        if (!!result.albumPic) {
            result.albumPic = result.albumPic.replace("http://", "https://") + "?param=500y500"
        }
        return result
    }

    _getAudio(keyBox: Uint8Array): Uint8Array {
        this.offset += this.view.getUint32(this.offset + 5, true) + 13
        const audioData = new Uint8Array(this.raw, this.offset)
        let lenAudioData = audioData.length
        for (let cur = 0; cur < lenAudioData; ++cur) audioData[cur] ^= keyBox[cur & 0xff]
        return audioData
    }

    async _buildMeta() {
        if (!this.oriMeta) throw Error("invalid sequence")

        const info = GetMetaFromFile(this.filename, this.oriMeta.musicName)

        // build artists
        let artists: string[] = [];
        if (!!this.oriMeta.artist) {
            this.oriMeta.artist.forEach(arr => artists.push(<string>arr[0]));
        }

        if (artists.length === 0 && !!info.artist) {
            artists = info.artist.split(',')
                .map(val => val.trim()).filter(val => val != "");
        }

        if (this.oriMeta.albumPic) try {
            this.image = await GetImageFromURL(this.oriMeta.albumPic)
            while (this.image && this.image.buffer.byteLength >= 1 << 24) {
                let img = await jimp.read(Buffer.from(this.image.buffer))
                await img.resize(Math.round(img.getHeight() / 2), jimp.AUTO)
                this.image.buffer = await img.getBufferAsync("image/jpeg")
            }
        } catch (e) {
            console.log("get cover image failed", e)
        }


        this.newMeta = {title: info.title, artists, album: this.oriMeta.album, picture: this.image?.buffer}
    }

    async _writeMeta() {
        if (!this.audio || !this.newMeta) throw Error("invalid sequence")

        if (!this.blob) this.blob = new Blob([this.audio], {type: this.mime})
        const ori = await metaParseBlob(this.blob);

        let shouldWrite = !ori.common.album && !ori.common.artists && !ori.common.title
        if (shouldWrite || this.newMeta.picture) {
            if (this.format === "mp3") {
                this.audio = WriteMetaToMp3(Buffer.from(this.audio), this.newMeta, ori)
            } else if (this.format === "flac") {
                this.audio = WriteMetaToFlac(Buffer.from(this.audio), this.newMeta, ori)
            } else {
                console.info(`writing meta for ${this.format} is not being supported for now`)
                return
            }
            this.blob = new Blob([this.audio], {type: this.mime})
        }
    }

    gatherResult(): DecryptResult {
        if (!this.newMeta) throw Error("bad sequence")
        return {
            title: this.newMeta.title,
            artist: this.newMeta.artists?.join("; "),
            ext: this.format,
            album: this.newMeta.album,
            picture: this.image?.url,
            file: URL.createObjectURL(this.blob),
            blob: this.blob as Blob,
            mime: this.mime
        }
    }

    async decrypt() {
        const keyBox = this._getKeyBox()
        this.oriMeta = this._getMetaData()
        this.audio = this._getAudio(keyBox)
        this.format = this.oriMeta.format || SniffAudioExt(this.audio)
        this.mime = AudioMimeType[this.format]
        await this._buildMeta()
        try {
            await this._writeMeta()
        } catch (e) {
            console.warn("write meta data failed", e)
        }
        return this.gatherResult()
    }


}


