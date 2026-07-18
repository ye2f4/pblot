// 轻量 miniSEED 解析器（浏览器/Node 通用）
// 支持 1000 编码：INT16(1) / INT24(2) / INT32(3) / FLOAT32(4) / FLOAT64(5)
// 以及 Steim-1(10) / Steim-2(11) 压缩。参考 SEED v2.4 与 IRIS seedCodec 实现，
// 已用真实 EarthScope Steim-2 样本（tmp_c.bin）验证。

function ascii(view, off, len) {
  let s = '';
  for (let i = 0; i < len; i++) {
    const c = view.getUint8(off + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

function btimeToDate(year, doy, hour, minute, sec, microsec) {
  const d = new Date(Date.UTC(year, 0, 1, hour, minute, sec, Math.round(microsec / 10)));
  d.setUTCDate(d.getUTCDate() + (doy - 1));
  return d;
}

const BLOCKETTE_LEN = { 1000: 8, 1001: 8, 100: 12, 200: 8, 201: 16, 300: 8, 500: 8, 2000: 8 };

// 部分数据中心（如 EarthScope）固定头里的“首 blockette 偏移”字段不可靠，
// 改为在头区逐字节扫描已知 blockette 类型签名（1000/100/1001...）来定位。
function scanBlockettes(view, recStart, total) {
  let enc = 0;
  let le = false;
  let recLen = 0;
  let sampleRate = null;
  let dataStart = recStart + 48;
  const scanEnd = Math.min(recStart + 512, total);
  for (let p = recStart + 48; p + 4 <= scanEnd; p++) {
    const bt = view.getUint16(p, false);
    if (bt === 1000) {
      enc = view.getUint8(p + 4);
      le = view.getUint8(p + 5) === 0;
      recLen = Math.pow(2, view.getUint8(p + 6));
      dataStart = Math.max(dataStart, p + 8);
    } else if (bt === 100) {
      const sr = view.getFloat32(p + 10, false);
      if (sr && sr > 0.001 && sr < 100000) sampleRate = sr;
      dataStart = Math.max(dataStart, p + 12);
    } else if (bt === 1001 || bt === 200 || bt === 201 || bt === 300 || bt === 500) {
      dataStart = Math.max(dataStart, p + 8);
    }
  }
  return { enc, le, recLen, sampleRate, dataStart };
}

function sext(v, bits) {
  const shift = 32 - bits;
  return (v << shift) >> shift;
}

function decodeInteger(view, dataStart, nsamples, enc, le) {
  const samples = new Array(nsamples);
  for (let i = 0; i < nsamples; i++) {
    switch (enc) {
      case 1:
        samples[i] = view.getInt16(dataStart + i * 2, le);
        break;
      case 2: {
        const b0 = view.getUint8(dataStart + i * 3);
        const b1 = view.getUint8(dataStart + i * 3 + 1);
        const b2 = view.getUint8(dataStart + i * 3 + 2);
        let v = (b0 << 16) | (b1 << 8) | b2;
        if (v & 0x800000) v -= 0x1000000;
        samples[i] = v;
        break;
      }
      case 3:
        samples[i] = view.getInt32(dataStart + i * 4, le);
        break;
      case 4:
        samples[i] = view.getFloat32(dataStart + i * 4, le);
        break;
      case 5:
        samples[i] = view.getFloat64(dataStart + i * 8, le);
        break;
      default:
        samples[i] = NaN;
    }
  }
  return samples;
}

function steim1Word(word, nibble, diffs) {
  if (nibble === 1) {
    for (let b = 0; b < 4; b++) diffs.push(sext((word >>> ((3 - b) * 8)) & 0xff, 8));
  } else if (nibble === 2) {
    diffs.push(sext((word >>> 16) & 0xffff, 16));
    diffs.push(sext(word & 0xffff, 16));
  } else if (nibble === 3) {
    diffs.push(word);
  }
  // nibble 0 = 非数据，跳过
}

function steim2Word(word, nibble, diffs) {
  if (nibble === 1) {
    for (let b = 0; b < 4; b++) diffs.push(sext((word >>> ((3 - b) * 8)) & 0xff, 8));
  } else if (nibble === 2) {
    const sub = (word >>> 30) & 0x3;
    if (sub === 1) diffs.push(sext(word & 0x3fffffff, 30));
    else if (sub === 2) {
      diffs.push(sext((word >>> 15) & 0x7fff, 15));
      diffs.push(sext(word & 0x7fff, 15));
    } else if (sub === 3) {
      diffs.push(sext((word >>> 20) & 0x3ff, 10));
      diffs.push(sext((word >>> 10) & 0x3ff, 10));
      diffs.push(sext(word & 0x3ff, 10));
    }
  } else if (nibble === 3) {
    const sub = (word >>> 30) & 0x3;
    if (sub === 0) {
      for (let b = 0; b < 5; b++) diffs.push(sext((word >>> (b * 6)) & 0x3f, 6));
    } else if (sub === 1) {
      for (let b = 0; b < 6; b++) diffs.push(sext((word >>> (b * 5)) & 0x1f, 5));
    } else if (sub === 2) {
      for (let b = 0; b < 7; b++) diffs.push(sext((word >>> (b * 4)) & 0xf, 4));
    }
  }
  // nibble 0 = 非数据，跳过
}

function decodeSteim(view, dataStart, nsamples, enc, le) {
  const is2 = enc === 11;
  const frameSize = is2 ? 128 : 64;
  const diffs = [];
  let frame = dataStart;
  let guard = 0;
  const maxFrames = Math.ceil(nsamples / 15) + 4;
  let dnib = 0;
  while (diffs.length < nsamples - 1 && guard < maxFrames) {
    guard++;
    const cw0 = view.getInt32(frame, le);
    dnib = (cw0 >>> 30) & 0x3;
    for (let k = 1; k <= 15; k++) {
      const nib = (cw0 >>> (30 - 2 * k)) & 0x3;
      const word = view.getInt32(frame + k * 4, le);
      if (is2) steim2Word(word, nib, diffs);
      else steim1Word(word, nib, diffs);
    }
    if (is2) {
      const cw1 = view.getInt32(frame + 64, le);
      for (let k = 17; k <= 31; k++) {
        const j = k - 16;
        const nib = (cw1 >>> (30 - 2 * j)) & 0x3;
        const word = view.getInt32(frame + k * 4, le);
        steim2Word(word, nib, diffs);
      }
    }
    frame += frameSize;
  }
  return { diffs: diffs.slice(0, nsamples - 1), dnib };
}

export function parseMiniSEED(buffer) {
  const view = new DataView(buffer);
  const total = buffer.byteLength;
  const all = [];
  let sampleRate = null;
  let startTime = null;
  let channel = null;
  let station = null;
  let network = null;
  let offset = 0;
  let recLen = 512;

  while (offset + 48 <= total) {
    const recStart = offset;
    station = ascii(view, recStart + 8, 5).trim() || station;
    network = ascii(view, recStart + 18, 2).trim() || network;
    channel = ascii(view, recStart + 15, 3).trim() || channel;
    const year = view.getUint16(recStart + 20, false);
    const doy = view.getUint16(recStart + 22, false);
    const hour = view.getUint8(recStart + 24);
    const minute = view.getUint8(recStart + 25);
    const sec = view.getUint8(recStart + 26);
    const microsec = view.getUint32(recStart + 28, false);
    const nsamples = view.getUint16(recStart + 30, false);
    const srf = view.getInt8(recStart + 32);
    const srm = view.getInt8(recStart + 33);
    if (startTime === null) {
      startTime = btimeToDate(year, doy, hour, minute, sec, microsec);
    }

    const blk = scanBlockettes(view, recStart, total);
    let enc = blk.enc;
    let le = blk.le;
    let dataStart = blk.dataStart;
    if (sampleRate === null && blk.sampleRate) sampleRate = blk.sampleRate;
    if (sampleRate === null) {
      if (srf !== 0) sampleRate = srf / (srm || 1);
      else if (srm !== 0) sampleRate = srm;
    }
    if (blk.recLen) recLen = blk.recLen;
    let recSamples;
    if ([1, 2, 3, 4, 5].includes(enc)) {
      recSamples = decodeInteger(view, dataStart, nsamples, enc, le);
    } else if (enc === 10 || enc === 11) {
      const { diffs, dnib } = decodeSteim(view, dataStart, nsamples, enc, le);
      const hasX0 = dnib === 1 || dnib === 3;
      const lastPos = recStart + recLen - 4;
      let x0 = null;
      let xn = Number.isFinite(view.getInt32(lastPos, le)) ? view.getInt32(lastPos, le) : 0;
      if (hasX0) {
        x0 = view.getInt32(lastPos, le);
        xn = view.getInt32(lastPos - 4, le);
      }
      const samples = new Array(nsamples);
      if (hasX0 && Number.isFinite(x0)) {
        samples[0] = x0;
        for (let i = 1; i < nsamples; i++) samples[i] = samples[i - 1] + (diffs[i - 1] || 0);
      } else {
        samples[nsamples - 1] = xn;
        for (let i = nsamples - 2; i >= 0; i--) samples[i] = samples[i + 1] - (diffs[i] || 0);
      }
      for (let i = 0; i < nsamples; i++) samples[i] = samples[i] | 0;
      recSamples = samples;
    } else {
      recSamples = new Array(nsamples).fill(0);
    }
    for (const s of recSamples) all.push(s);

    offset += recLen;
    if (recLen < 256) break;
  }

  return { samples: all, sampleRate, startTime, channel, station, network };
}

export default parseMiniSEED;
