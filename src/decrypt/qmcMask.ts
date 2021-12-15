const QMCDefaultMaskMatrix = [
    0xde, 0x51, 0xfa, 0xc3, 0x4a, 0xd6, 0xca, 0x90,
    0x7e, 0x67, 0x5e, 0xf7, 0xd5, 0x52, 0x84, 0xd8,
    0x47, 0x95, 0xbb, 0xa1, 0xaa, 0xc6, 0x66, 0x23,
    0x92, 0x62, 0xf3, 0x74, 0xa1, 0x9f, 0xf4, 0xa0,
    0x1d, 0x3f, 0x5b, 0xf0, 0x13, 0x0e, 0x09, 0x3d,
    0xf9, 0xbc, 0x00, 0x11];

const AllMapping: number[][] = [];
const Mask128to44: number[] = [];

(function () {
    for (let i = 0; i < 128; i++) {
        let realIdx = (i * i + 27) % 256
        if (realIdx in AllMapping) {
            AllMapping[realIdx].push(i)
        } else {
            AllMapping[realIdx] = [i]
        }
    }

    let idx44 = 0
    AllMapping.forEach(all128 => {
        all128.forEach(_i128 => {
            Mask128to44[_i128] = idx44
        })
        idx44++
    })
})();

export class QmcMask {
    private readonly Matrix128: number[];

    constructor(matrix: number[] | Uint8Array) {
        if (matrix instanceof Uint8Array) matrix = Array.from(matrix)
        if (matrix.length === 44) {
            this.Matrix128 = this._generate128(matrix)
        } else if (matrix.length === 128) {
            this.Matrix128 = matrix
        } else {
            throw Error("invalid mask length")
        }
    }

    getMatrix128() {
        return this.Matrix128
    }

    getMatrix44(): number[] {
        const matrix44: number[] = []
        let idxI44 = 0
        AllMapping.forEach(it256 => {
            let it256Len = it256.length
            for (let i = 1; i < it256Len; i++) {
                if (this.Matrix128[it256[0]] !== this.Matrix128[it256[i]]) {
                    throw "decode mask-128 to mask-44 failed"
                }
            }
            matrix44[idxI44] = this.Matrix128[it256[0]]
            idxI44++
        })
        return matrix44
    }

    Decrypt(data: Uint8Array) {
        if (!this.Matrix128) throw Error("bad call sequence")
        let dst = data.slice(0);
        let index = -1;
        let maskIdx = -1;
        for (let cur = 0; cur < data.length; cur++) {
            index++;
            maskIdx++;
            if (index === 0x8000 || (index > 0x8000 && (index + 1) % 0x8000 === 0)) {
                index++;
                maskIdx++;
            }
            if (maskIdx >= 128) maskIdx -= 128;
            dst[cur] ^= this.Matrix128[maskIdx];
        }
        return dst;
    }

    private _generate128(matrix44: number[]): number[] {
        const matrix128: number[] = []
        let idx44 = 0
        AllMapping.forEach(it256 => {
            it256.forEach(m => {
                matrix128[m] = matrix44[idx44]
            })
            idx44++
        })
        return matrix128
    }
}

export function QmcMaskGetDefault() {
    return new QmcMask(QMCDefaultMaskMatrix)
}
