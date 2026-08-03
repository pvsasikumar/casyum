/**
 * Compact QR Code encoder (byte mode, error correction level M).
 * Self-contained implementation that renders to a canvas element.
 * Based on the public-domain QR algorithm described by ISO/IEC 18004.
 */

// Alignment pattern centre positions per version (index 0 unused).
const PATTERN_POSITION_TABLE: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | 1;
const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | 1;
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | 1;

// Error correction level M RS blocks: [totalCodewords, dataCodewords].
const RS_BLOCK_TABLE_M: number[][][] = [
  [[26, 16]],
  [[44, 28]],
  [[70, 44]],
  [[50, 32], [50, 32]],
  [[67, 43], [67, 43]],
  [[43, 27], [43, 27], [43, 27], [43, 27]],
  [[49, 31], [49, 31], [49, 31], [49, 31]],
  [[60, 38], [60, 38], [61, 39], [61, 39]],
  [[58, 36], [58, 36], [59, 37], [59, 37], [59, 37]],
  [[69, 43], [69, 43], [69, 43], [69, 43], [70, 44]],
  [[80, 50], [80, 50], [80, 50], [80, 50], [81, 51]],
  [[58, 36], [58, 36], [58, 36], [58, 36], [59, 37], [59, 37], [59, 37], [59, 37]],
  [[59, 37], [59, 37], [59, 37], [59, 37], [60, 38], [60, 38], [60, 38], [60, 38], [60, 38]],
  [[64, 40], [64, 40], [64, 40], [64, 40], [65, 41], [65, 41], [65, 41], [65, 41], [65, 41]],
  [[65, 41], [65, 41], [65, 41], [65, 41], [66, 42], [66, 42], [66, 42], [66, 42], [66, 42], [66, 42], [66, 42]],
  [[73, 45], [73, 45], [73, 45], [73, 45], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46]],
  [[74, 46], [74, 46], [74, 46], [74, 46], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47]],
  [[75, 47], [75, 47], [75, 47], [75, 47], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48]],
  [[80, 50], [80, 50], [80, 50], [80, 50], [81, 51], [81, 51], [81, 51], [81, 51], [81, 51], [81, 51], [81, 51], [81, 51]],
  [[82, 52], [82, 52], [82, 52], [82, 52], [83, 53], [83, 53], [83, 53], [83, 53], [83, 53], [83, 53], [83, 53], [83, 53]],
  [[87, 55], [87, 55], [87, 55], [88, 56], [88, 56], [88, 56], [88, 56], [88, 56], [88, 56], [88, 56], [88, 56], [88, 56], [88, 56], [88, 56]],
  [[92, 58], [92, 58], [92, 58], [93, 59], [93, 59], [93, 59], [93, 59], [93, 59], [93, 59], [93, 59], [93, 59], [93, 59], [93, 59], [93, 59]],
  [[93, 59], [93, 59], [93, 59], [94, 60], [94, 60], [94, 60], [94, 60], [94, 60], [94, 60], [94, 60], [94, 60], [94, 60], [94, 60], [94, 60]],
  [[100, 64], [100, 64], [100, 64], [101, 65], [101, 65], [101, 65], [101, 65], [101, 65], [101, 65], [101, 65], [101, 65], [101, 65], [101, 65], [101, 65]],
  [[101, 65], [101, 65], [101, 65], [102, 66], [102, 66], [102, 66], [102, 66], [102, 66], [102, 66], [102, 66], [102, 66], [102, 66], [102, 66], [102, 66]],
  [[108, 68], [108, 68], [108, 68], [109, 69], [109, 69], [109, 69], [109, 69], [109, 69], [109, 69], [109, 69], [109, 69], [109, 69], [109, 69], [109, 69]],
  [[109, 69], [109, 69], [109, 69], [110, 70], [110, 70], [110, 70], [110, 70], [110, 70], [110, 70], [110, 70], [110, 70], [110, 70], [110, 70], [110, 70]],
  [[112, 70], [112, 70], [112, 70], [113, 71], [113, 71], [113, 71], [113, 71], [113, 71], [113, 71], [113, 71], [113, 71], [113, 71], [113, 71], [113, 71]],
  [[121, 75], [121, 75], [121, 75], [122, 76], [122, 76], [122, 76], [122, 76], [122, 76], [122, 76], [122, 76], [122, 76], [122, 76], [122, 76], [122, 76]],
  [[124, 78], [124, 78], [124, 78], [125, 79], [125, 79], [125, 79], [125, 79], [125, 79], [125, 79], [125, 79], [125, 79], [125, 79], [125, 79], [125, 79]],
];

function getBCHDigit(data: number): number {
  let digit = 0;
  let value = data;
  while (value !== 0) {
    digit += 1;
    value >>>= 1;
  }
  return digit;
}

function getBCHTypeInfo(data: number): number {
  let d = data << 10;
  while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
    d ^= G15 << (getBCHDigit(d) - getBCHDigit(G15));
  }
  return ((data << 10) | d) ^ G15_MASK;
}

function getBCHTypeNumber(data: number): number {
  let d = data << 12;
  while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
    d ^= G18 << (getBCHDigit(d) - getBCHDigit(G18));
  }
  return (data << 12) | d;
}

const MODE_BYTE = 1 << 3;

function getLengthInBits(mode: number, type: number): number {
  if (mode !== MODE_BYTE) throw new Error('Only byte mode is supported.');
  if (type >= 1 && type < 10) return 8;
  return 16;
}

function getErrorCorrectPolynomial(errorCorrectLength: number): QRPolynomial {
  let poly = new QRPolynomial([1], 0);
  for (let i = 0; i < errorCorrectLength; i += 1) {
    poly = poly.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
  }
  return poly;
}

function getMask(maskPattern: number, i: number, j: number): boolean {
  switch (maskPattern) {
    case 0:
      return (i + j) % 2 === 0;
    case 1:
      return i % 2 === 0;
    case 2:
      return j % 3 === 0;
    case 3:
      return (i + j) % 3 === 0;
    case 4:
      return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
    case 5:
      return ((i * j) % 2) + ((i * j) % 3) === 0;
    case 6:
      return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
    case 7:
      return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
    default:
      return false;
  }
}

const EXP_TABLE = new Array<number>(256);
const LOG_TABLE = new Array<number>(256);
for (let i = 0; i < 8; i += 1) EXP_TABLE[i] = 1 << i;
for (let i = 8; i < 256; i += 1) {
  EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
}
for (let i = 0; i < 255; i += 1) {
  LOG_TABLE[EXP_TABLE[i]] = i;
}

const QRMath = {
  glog(n: number): number {
    if (n < 1) throw new Error('glog(' + n + ')');
    return LOG_TABLE[n];
  },
  gexp(n: number): number {
    let value = n;
    while (value < 0) value += 255;
    while (value >= 256) value -= 255;
    return EXP_TABLE[value];
  },
};

class QRPolynomial {
  private num: number[];

  constructor(num: number[], shift: number) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset += 1;
    this.num = new Array<number>(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i += 1) {
      this.num[i] = num[i + offset];
    }
  }

  get(index: number): number {
    return this.num[index];
  }

  getLength(): number {
    return this.num.length;
  }

  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array<number>(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i += 1) {
      for (let j = 0; j < e.getLength(); j += 1) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
    }
    return new QRPolynomial(num, 0);
  }

  mod(e: QRPolynomial): QRPolynomial {
    const thisLen = this.getLength();
    const eLen = e.getLength();
    if (thisLen - eLen < 0) return this;
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = this.num.slice();
    for (let i = 0; i < eLen; i += 1) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new QRPolynomial(num, 0).mod(e);
  }
}

class QRRSBlock {
  readonly totalCount: number;
  readonly dataCount: number;

  constructor(totalCount: number, dataCount: number) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }

  static getRSBlocks(typeNumber: number): QRRSBlock[] {
    const blocks = RS_BLOCK_TABLE_M[typeNumber - 1];
    return blocks.map(([total, data]) => new QRRSBlock(total, data));
  }
}

class QRBitBuffer {
  private buffer: number[] = [];
  private length = 0;

  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }

  put(num: number, length: number): void {
    for (let i = 0; i < length; i += 1) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  getLengthInBits(): number {
    return this.length;
  }

  putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length += 1;
  }
}

function getTypeNumber(dataBytes: number): number {
  const bitLength = 4 + getLengthInBits(MODE_BYTE, 10) + dataBytes * 8;
  const dataCodewords = Math.ceil(bitLength / 8);
  for (let version = 1; version <= RS_BLOCK_TABLE_M.length; version += 1) {
    const blocks = QRRSBlock.getRSBlocks(version);
    const totalData = blocks.reduce((sum, b) => sum + b.dataCount, 0);
    if (totalData >= dataCodewords + 2) return version;
  }
  throw new Error('Data too long to encode.');
}

const ERROR_CORRECT_LEVEL_M_BITS = 0b00;

class QRCode {
  private typeNumber: number;
  private moduleCount = 0;
  private modules: (boolean | null)[][] = [];
  private dataList: { data: string; mode: number; getLength(): number; write(buffer: QRBitBuffer): void }[] = [];

  constructor(typeNumber: number) {
    this.typeNumber = typeNumber;
  }

  addData(data: string): void {
    const typeNumber = this.typeNumber;
    this.dataList.push({
      data,
      mode: MODE_BYTE,
      getLength(): number {
        return data.length;
      },
      write(buffer: QRBitBuffer): void {
        buffer.put(MODE_BYTE, 4);
        buffer.put(data.length, getLengthInBits(MODE_BYTE, typeNumber));
        for (let i = 0; i < data.length; i += 1) {
          buffer.put(data.charCodeAt(i), 8);
        }
      },
    });
  }

  make(): void {
    this.makeImpl(false, this.getBestMaskPattern());
  }

  private getBestMaskPattern(): number {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i += 1) {
      this.makeImpl(true, i);
      const lostPoint = this.getLostPoint();
      if (i === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  }

  private makeImpl(test: boolean, maskPattern: number): void {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = [];
    for (let row = 0; row < this.moduleCount; row += 1) {
      this.modules.push(new Array<boolean | null>(this.moduleCount).fill(null));
    }
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);
    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }
    if (this.dataList.length > 0) {
      this.mapData(this.createData(), maskPattern);
    }
  }

  private setupPositionProbePattern(row: number, col: number): void {
    for (let r = -1; r <= 7; r += 1) {
      for (let c = -1; c <= 7; c += 1) {
        if (row + r <= -1 || this.moduleCount <= row + r || col + c <= -1 || this.moduleCount <= col + c) {
          continue;
        }
        this.modules[row + r][col + c] =
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4);
      }
    }
  }

  private setupTimingPattern(): void {
    for (let r = 8; r < this.moduleCount - 8; r += 1) {
      if (this.modules[r][6] !== null) continue;
      this.modules[r][6] = r % 2 === 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c += 1) {
      if (this.modules[6][c] !== null) continue;
      this.modules[6][c] = c % 2 === 0;
    }
  }

  private setupPositionAdjustPattern(): void {
    const pos = PATTERN_POSITION_TABLE[this.typeNumber - 1];
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = 0; j < pos.length; j += 1) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules[row][col] !== null) continue;
        for (let r = -2; r <= 2; r += 1) {
          for (let c = -2; c <= 2; c += 1) {
            this.modules[row + r][col + c] = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
          }
        }
      }
    }
  }

  private setupTypeNumber(test: boolean): void {
    const bits = getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: number): void {
    const data = (ERROR_CORRECT_LEVEL_M_BITS << 3) | maskPattern;
    const bits = getBCHTypeInfo(data);
    for (let i = 0; i < 15; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }
    }
    for (let i = 0; i < 15; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }
    this.modules[this.moduleCount - 8][8] = !test;
  }

  private createData(): QRBitBuffer {
    const buffer = new QRBitBuffer();
    for (const data of this.dataList) {
      data.write(buffer);
    }
    const rsBlocks = QRRSBlock.getRSBlocks(this.typeNumber);
    const totalDataCount = rsBlocks.reduce((sum, b) => sum + b.dataCount, 0);
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error('code length overflow. (' + buffer.getLengthInBits() + '>' + totalDataCount * 8 + ')');
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }
    while (buffer.getLengthInBits() % 8 !== 0) {
      buffer.putBit(false);
    }
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(0xec, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }
    return this.createBytes(buffer, rsBlocks);
  }

  private createBytes(buffer: QRBitBuffer, rsBlocks: QRRSBlock[]): QRBitBuffer {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata: number[][] = [];
    const ecdata: number[][] = [];
    for (const rsBlock of rsBlocks) {
      const dcCount = rsBlock.dataCount;
      const ecCount = rsBlock.totalCount - rsBlock.dataCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata.push(new Array<number>(dcCount).fill(0));
      for (let i = 0; i < dcCount; i += 1) {
        dcdata[dcdata.length - 1][i] = 0xff & (buffer.get(i + offset) ? 1 : 0);
      }
      offset += dcCount;
      const rsPoly = getErrorCorrectPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcdata[dcdata.length - 1], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata.push(new Array<number>(rsPoly.getLength() - 1).fill(0));
      for (let i = 0; i < ecdata[ecdata.length - 1].length; i += 1) {
        const modIndex = i + modPoly.getLength() - ecdata[ecdata.length - 1].length;
        ecdata[ecdata.length - 1][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }
    const data = new QRBitBuffer();
    for (let i = 0; i < maxDcCount; i += 1) {
      for (let r = 0; r < dcdata.length; r += 1) {
        if (i < dcdata[r].length) data.put(dcdata[r][i], 8);
      }
    }
    for (let i = 0; i < maxEcCount; i += 1) {
      for (let r = 0; r < ecdata.length; r += 1) {
        if (i < ecdata[r].length) data.put(ecdata[r][i], 8);
      }
    }
    return data;
  }

  private mapData(data: QRBitBuffer, maskPattern: number): void {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;
      while (true) {
        for (let c = 0; c < 2; c += 1) {
          const colc = col - c;
          if (this.modules[row][colc] === null) {
            let dark = false;
            if (byteIndex < data.getLengthInBits()) {
              dark = data.get(byteIndex);
            }
            const mask = getMask(maskPattern, row, colc);
            if (mask) dark = !dark;
            this.modules[row][colc] = dark;
            bitIndex -= 1;
          }
          if (bitIndex === -1) {
            byteIndex += 1;
            bitIndex = 7;
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  private getLostPoint(): number {
    let lostPoint = 0;
    const moduleCount = this.moduleCount;
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        let sameCount = 0;
        const dark = this.isDark(row, col);
        for (let r = -1; r <= 1; r += 1) {
          if (row + r < 0 || moduleCount <= row + r) continue;
          for (let c = -1; c <= 1; c += 1) {
            if (col + c < 0 || moduleCount <= col + c) continue;
            if (r === 0 && c === 0) continue;
            if (dark === this.isDark(row + r, col + c)) sameCount += 1;
          }
        }
        if (sameCount > 5) lostPoint += 3 + sameCount - 5;
      }
    }
    for (let row = 0; row < moduleCount - 1; row += 1) {
      for (let col = 0; col < moduleCount - 1; col += 1) {
        let count = 0;
        if (this.isDark(row, col)) count += 1;
        if (this.isDark(row + 1, col)) count += 1;
        if (this.isDark(row, col + 1)) count += 1;
        if (this.isDark(row + 1, col + 1)) count += 1;
        if (count === 0 || count === 4) lostPoint += 3;
      }
    }
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount - 6; col += 1) {
        if (
          this.isDark(row, col) &&
          !this.isDark(row, col + 1) &&
          this.isDark(row, col + 2) &&
          this.isDark(row, col + 3) &&
          this.isDark(row, col + 4) &&
          !this.isDark(row, col + 5) &&
          this.isDark(row, col + 6)
        ) {
          lostPoint += 40;
        }
      }
    }
    for (let col = 0; col < moduleCount; col += 1) {
      for (let row = 0; row < moduleCount - 6; row += 1) {
        if (
          this.isDark(row, col) &&
          !this.isDark(row + 1, col) &&
          this.isDark(row + 2, col) &&
          this.isDark(row + 3, col) &&
          this.isDark(row + 4, col) &&
          !this.isDark(row + 5, col) &&
          this.isDark(row + 6, col)
        ) {
          lostPoint += 40;
        }
      }
    }
    let darkCount = 0;
    for (let col = 0; col < moduleCount; col += 1) {
      for (let row = 0; row < moduleCount; row += 1) {
        if (this.isDark(row, col)) darkCount += 1;
      }
    }
    const ratio = Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;
    return lostPoint;
  }

  private isDark(row: number, col: number): boolean {
    return this.modules[row][col] === true;
  }

  getModuleCount(): number {
    return this.moduleCount;
  }

  getModule(row: number, col: number): boolean {
    return this.modules[row][col] === true;
  }
}

export interface QRMatrix {
  size: number;
  modules: boolean[][];
}

/**
 * QR payload for participant passes.
 *
 * SECURITY: the QR code never stores participant PII (name, email, phone,
 * verification status, college, department...). It only encodes the unique
 * participant identifier (Firestore document id). All participant details are
 * fetched securely from Firestore after a successful scan.
 *
 * Supported payload formats (all decode to a bare participant id):
 *   - <participantId>              (canonical, current)
 *   - casyum:reg:<participantId>   (legacy prefix)
 *   - base64 {participantId,...}   (legacy coordinator check-in payload)
 */
export const QR_PREFIX = 'casyum:reg:';

export function encodeParticipantQR(participantId: string): string {
  return String(participantId || '').trim();
}

export function decodeQRPayload(data: string): string | null {
  const raw = String(data || '').trim();
  if (!raw) return null;

  if (raw.startsWith(QR_PREFIX)) {
    const id = raw.slice(QR_PREFIX.length).trim();
    return id || null;
  }

  try {
    const decoded = atob(raw);
    if (decoded.startsWith('{')) {
      const parsed = JSON.parse(decoded) as { participantId?: string };
      if (parsed && parsed.participantId) return String(parsed.participantId);
    }
  } catch {
    // Not a base64 payload — fall through to treating it as a bare id.
  }

  return raw;
}

export function generateQRMatrix(text: string): QRMatrix {
  const utf8 = unescape(encodeURIComponent(text));
  const typeNumber = getTypeNumber(utf8.length);
  const qr = new QRCode(typeNumber);
  qr.addData(utf8);
  qr.make();
  const size = qr.getModuleCount();
  const modules: boolean[][] = [];
  for (let row = 0; row < size; row += 1) {
    const line: boolean[] = [];
    for (let col = 0; col < size; col += 1) {
      line.push(qr.getModule(row, col));
    }
    modules.push(line);
  }
  return { size, modules };
}

export function drawQRToCanvas(
  canvas: HTMLCanvasElement,
  matrix: QRMatrix,
  scale = 8,
  foreground = '#ffffff',
  background = '#000000'
): void {
  const dim = matrix.size * scale;
  const quietZone = scale * 2;
  canvas.width = dim + quietZone * 2;
  canvas.height = dim + quietZone * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = foreground;
  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (matrix.modules[row][col]) {
        ctx.fillRect(quietZone + col * scale, quietZone + row * scale, scale, scale);
      }
    }
  }
}
