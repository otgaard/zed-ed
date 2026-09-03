import{n as e}from"./chunk-Dk7t3yRR.js";var t=`// packing.js — CPU-side packing/unpacking, the engine script library behind
//
//     import { pkPackU8x4, pkPackHalf2x16 /* … */ } from 'zed:packing.js';
//
// available in every script / data-script / canvas script with no setup (an
// engine-provided \`zed:\` module; a project script named \`packing.js\` shadows
// it, mirroring how a project GLSL snippet shadows an engine include). Its GPU
// twin is the <unpacking> engine library (src/lib/shaders/unpackingGlsl.ts):
// every export names its GLSL counterpart, and packing.test.ts pins the two
// sides bit-identical. Full guide with worked examples: docs/packing.md.
//
// This file is DUAL-USE, platformerLib.js style — imported directly by vitest
// AND served verbatim as module source at script compile time. HARD
// constraints (enforced by the packing.test.ts "source purity" suite):
//   * NO \`import\` / \`require\` — fully self-contained.
//   * NO TypeScript syntax — plain JS + JSDoc types only (tsconfig \`checkJs\`).
//   * NO host/DOM/global-scope access — pure + deterministic.
//
// CARRIERS — how packed words travel to the GPU:
//   * UBO uint/float members ....... outputs.MyBlock.member.set(word) in a
//     data-script. uint members carry full 32-bit words; float members carry
//     integers EXACTLY only below 2^24 (PK_MAX_EXACT — see pkExactFloat).
//   * rgba8 \`@output\` textures ..... pkWriteU32ToRGBA8 into the Uint8Array you
//     upload(); the shader recovers the word with pkWordFromUnorm4.
//   * r32f/rgba32f data textures ... float lanes, 2^24 rule again; the shader
//     decodes with pkFieldFromFloat / pkIntFromFloat.
//   * r16f/rg16f/rgba16f \`@output\` textures ... upload a Float32Array (GL
//     narrows to half), or pkPackHalfArray it to a Uint16Array first and let
//     upload() take the HALF_FLOAT path (half the CPU copy, no re-quantise).
//     pkFloatToHalfBits is also the UBO-carried-half scalar (pkPackHalf2x16
//     into a uint member, native unpackHalf2x16 GPU-side).
//
// CONVENTIONS shared with the GPU twin:
//   * Lane order is little-endian: lane 0 = the low byte/half of the word, and
//     pkWriteU32ToRGBA8 puts the low byte in R (so texel.r is lane 0).
//   * Rounding is Math.floor(x + 0.5) — round-half-toward-+inf — on BOTH
//     sides (GLSL round() is driver-chosen at .5; the twin never uses it).
//   * All word results are unsigned 32-bit (\`>>> 0\`); signed extraction is
//     two's-complement.

// ─────────────────────────────────────────────────────────────── bitfields

/**
 * Mask with the low n bits set. Clamped: n <= 0 gives 0, n >= 32 gives
 * 0xffffffff (a raw 1 << 32 wraps in JS and is UB in GLSL).
 * GLSL twin: pkMaskBelow.
 * @param {number} n Number of low bits to set.
 * @returns {number} (1 << n) - 1 as an unsigned 32-bit value.
 */
export function pkMaskBelow(n) {
  return n <= 0 ? 0 : n >= 32 ? 0xffffffff : ((1 << n) >>> 0) - 1;
}

/**
 * Extract an unsigned bitfield: \`bits\` bits of \`word\` starting at bit \`off\`.
 * GLSL twin: pkExtractU.
 * @param {number} word Source 32-bit word.
 * @param {number} off Bit offset of the field's low bit (0-31).
 * @param {number} bits Field width in bits.
 * @returns {number} The field, right-aligned, zero-extended.
 */
export function pkExtractU(word, off, bits) {
  return ((word >>> off) & pkMaskBelow(bits)) >>> 0;
}

/**
 * Extract a signed (two's-complement) bitfield with sign extension.
 * Precondition: bits >= 1 and off + bits <= 32.
 * GLSL twin: pkExtractS.
 * @param {number} word Source 32-bit word.
 * @param {number} off Bit offset of the field's low bit.
 * @param {number} bits Field width in bits, >= 1.
 * @returns {number} The field, sign-extended (negative when the top bit is set).
 */
export function pkExtractS(word, off, bits) {
  return (word << (32 - off - bits)) >> (32 - bits);
}

/**
 * Insert a bitfield into a word (excess high bits of \`field\` are masked off).
 * GLSL twin: pkInsert.
 * @param {number} base Word to insert into.
 * @param {number} field Field value.
 * @param {number} off Bit offset of the field's low bit.
 * @param {number} bits Field width in bits.
 * @returns {number} base with the field replaced, as unsigned 32-bit.
 */
export function pkInsert(base, field, off, bits) {
  const m = pkMaskBelow(bits);
  return ((base & ~(m << off)) | ((field & m) << off)) >>> 0;
}

/**
 * Index of the highest set bit, -1 for zero.
 * GLSL twin: pkFindMSB.
 * @param {number} v Source word.
 * @returns {number} 0-31, or -1 when v is 0.
 */
export function pkFindMSB(v) {
  return v === 0 ? -1 : 31 - Math.clz32(v >>> 0);
}

// ──────────────────────────────────────────────── byte / short lanes (u32)

/**
 * Pack four unsigned bytes into a word; b0 lands in the low byte.
 * GLSL twin: pkPackU8x4 (decode lanes with pkU8 / pkUnpackU8x4).
 * @param {number} b0 Lane 0 (low byte), 0-255.
 * @param {number} b1 Lane 1, 0-255.
 * @param {number} b2 Lane 2, 0-255.
 * @param {number} b3 Lane 3 (high byte), 0-255.
 * @returns {number} The packed word.
 */
export function pkPackU8x4(b0, b1, b2, b3) {
  return ((b0 & 0xff) | ((b1 & 0xff) << 8) | ((b2 & 0xff) << 16) | ((b3 & 0xff) << 24)) >>> 0;
}

/**
 * Pack four signed bytes (-128..127, two's complement) into a word.
 * GLSL decode: pkS8 / pkUnpackS8x4.
 * @param {number} b0 Lane 0 (low byte), -128..127.
 * @param {number} b1 Lane 1, -128..127.
 * @param {number} b2 Lane 2, -128..127.
 * @param {number} b3 Lane 3 (high byte), -128..127.
 * @returns {number} The packed word.
 */
export function pkPackS8x4(b0, b1, b2, b3) {
  return pkPackU8x4(b0, b1, b2, b3); // masking makes two's complement fall out
}

/**
 * Unsigned byte lane i (0-3) of a word; lane 0 is the low byte.
 * GLSL twin: pkU8.
 * @param {number} word Source word.
 * @param {number} lane Lane index 0-3.
 * @returns {number} The byte, 0-255.
 */
export function pkU8(word, lane) {
  return (word >>> (lane << 3)) & 0xff;
}

/**
 * Signed byte lane i (0-3) of a word, sign-extended.
 * GLSL twin: pkS8.
 * @param {number} word Source word.
 * @param {number} lane Lane index 0-3.
 * @returns {number} The byte, -128..127.
 */
export function pkS8(word, lane) {
  return pkExtractS(word, lane << 3, 8);
}

/**
 * Pack two unsigned shorts into a word; l0 lands in the low half.
 * GLSL twin: pkPackU16x2 (decode with pkU16 / pkUnpackU16x2).
 * @param {number} l0 Lane 0 (low half), 0-65535.
 * @param {number} l1 Lane 1 (high half), 0-65535.
 * @returns {number} The packed word.
 */
export function pkPackU16x2(l0, l1) {
  return ((l0 & 0xffff) | ((l1 & 0xffff) << 16)) >>> 0;
}

/**
 * Pack two signed shorts (-32768..32767, two's complement) into a word.
 * GLSL decode: pkS16 / pkUnpackS16x2.
 * @param {number} l0 Lane 0 (low half), -32768..32767.
 * @param {number} l1 Lane 1 (high half), -32768..32767.
 * @returns {number} The packed word.
 */
export function pkPackS16x2(l0, l1) {
  return pkPackU16x2(l0, l1);
}

/**
 * Unsigned short lane i (0-1) of a word; lane 0 is the low half.
 * GLSL twin: pkU16.
 * @param {number} word Source word.
 * @param {number} lane Lane index 0-1.
 * @returns {number} The short, 0-65535.
 */
export function pkU16(word, lane) {
  return (word >>> (lane << 4)) & 0xffff;
}

/**
 * Signed short lane i (0-1) of a word, sign-extended.
 * GLSL twin: pkS16.
 * @param {number} word Source word.
 * @param {number} lane Lane index 0-1.
 * @returns {number} The short, -32768..32767.
 */
export function pkS16(word, lane) {
  return pkExtractS(word, lane << 4, 16);
}

// ─────────────────────────────────────── normalized (unorm/snorm) formats
// The 4x8 pair mirrors the GLSL gap-fills pkPackUnorm4x8 & co; the 2x16 and
// rgb10a2 pairs are CPU mirrors of the NATIVE GPU built-ins packUnorm2x16 /
// packSnorm2x16 (and the rgb10a2 helpers), for readback and tests.

/** @param {number} v @returns {number} v clamped to [0,1]. */
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** @param {number} v @returns {number} v clamped to [-1,1]. */
function clamp11(v) {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}

/**
 * Encode one [0,1] float as a unorm byte (clamped, floor(x*255 + 0.5)).
 * GLSL decode: pkByteFromUnorm / sampling an rgba8 texture.
 * @param {number} v Value in [0,1] (clamped).
 * @returns {number} The byte, 0-255.
 */
export function pkUnormByte(v) {
  return Math.floor(clamp01(v) * 255 + 0.5);
}

/**
 * Decode a unorm byte back to [0,1].
 * GLSL twin: pkUnormFromByte.
 * @param {number} b The byte, 0-255.
 * @returns {number} b / 255.
 */
export function pkByteToUnorm(b) {
  return b / 255;
}

/**
 * Four [0,1] floats -> unorm8x4 word; x lands in the low byte.
 * GLSL decode: pkUnpackUnorm4x8 (this is the packUnorm4x8 WebGL2 lacks).
 * @param {number} x Lane 0, clamped to [0,1].
 * @param {number} y Lane 1, clamped to [0,1].
 * @param {number} z Lane 2, clamped to [0,1].
 * @param {number} w Lane 3, clamped to [0,1].
 * @returns {number} The packed word.
 */
export function pkPackUnorm4x8(x, y, z, w) {
  return pkPackU8x4(pkUnormByte(x), pkUnormByte(y), pkUnormByte(z), pkUnormByte(w));
}

/**
 * unorm8x4 word -> four [0,1] floats (x = low byte).
 * GLSL twin: pkUnpackUnorm4x8.
 * @param {number} word Source word.
 * @param {number[]} [out] Optional 4-element target (GC-free hot loops).
 * @returns {number[]} [x, y, z, w] in [0,1].
 */
export function pkUnpackUnorm4x8(word, out) {
  const o = out || [0, 0, 0, 0];
  o[0] = (word & 0xff) / 255;
  o[1] = ((word >>> 8) & 0xff) / 255;
  o[2] = ((word >>> 16) & 0xff) / 255;
  o[3] = ((word >>> 24) & 0xff) / 255;
  return o;
}

/**
 * Four [-1,1] floats -> snorm8x4 word; x lands in the low byte.
 * GLSL decode: pkUnpackSnorm4x8 (this is the packSnorm4x8 WebGL2 lacks).
 * @param {number} x Lane 0, clamped to [-1,1].
 * @param {number} y Lane 1, clamped to [-1,1].
 * @param {number} z Lane 2, clamped to [-1,1].
 * @param {number} w Lane 3, clamped to [-1,1].
 * @returns {number} The packed word.
 */
export function pkPackSnorm4x8(x, y, z, w) {
  return pkPackS8x4(
    Math.floor(clamp11(x) * 127 + 0.5),
    Math.floor(clamp11(y) * 127 + 0.5),
    Math.floor(clamp11(z) * 127 + 0.5),
    Math.floor(clamp11(w) * 127 + 0.5),
  );
}

/**
 * snorm8x4 word -> four [-1,1] floats (x = low byte; -128 clamps to -1).
 * GLSL twin: pkUnpackSnorm4x8.
 * @param {number} word Source word.
 * @param {number[]} [out] Optional 4-element target.
 * @returns {number[]} [x, y, z, w] in [-1,1].
 */
export function pkUnpackSnorm4x8(word, out) {
  const o = out || [0, 0, 0, 0];
  o[0] = clamp11(pkS8(word, 0) / 127);
  o[1] = clamp11(pkS8(word, 1) / 127);
  o[2] = clamp11(pkS8(word, 2) / 127);
  o[3] = clamp11(pkS8(word, 3) / 127);
  return o;
}

/**
 * Two [0,1] floats -> unorm16x2 word (CPU mirror of the NATIVE GPU
 * packUnorm2x16 — decode GPU-side with the built-in unpackUnorm2x16).
 * @param {number} x Lane 0 (low half), clamped to [0,1].
 * @param {number} y Lane 1 (high half), clamped to [0,1].
 * @returns {number} The packed word.
 */
export function pkPackUnorm2x16(x, y) {
  return pkPackU16x2(
    Math.floor(clamp01(x) * 65535 + 0.5),
    Math.floor(clamp01(y) * 65535 + 0.5),
  );
}

/**
 * unorm16x2 word -> two [0,1] floats (mirror of the GPU unpackUnorm2x16).
 * @param {number} word Source word.
 * @param {number[]} [out] Optional 2-element target.
 * @returns {number[]} [x, y] in [0,1].
 */
export function pkUnpackUnorm2x16(word, out) {
  const o = out || [0, 0];
  o[0] = (word & 0xffff) / 65535;
  o[1] = ((word >>> 16) & 0xffff) / 65535;
  return o;
}

/**
 * Two [-1,1] floats -> snorm16x2 word (CPU mirror of the NATIVE GPU
 * packSnorm2x16 — decode GPU-side with the built-in unpackSnorm2x16).
 * @param {number} x Lane 0 (low half), clamped to [-1,1].
 * @param {number} y Lane 1 (high half), clamped to [-1,1].
 * @returns {number} The packed word.
 */
export function pkPackSnorm2x16(x, y) {
  return pkPackS16x2(
    Math.floor(clamp11(x) * 32767 + 0.5),
    Math.floor(clamp11(y) * 32767 + 0.5),
  );
}

/**
 * snorm16x2 word -> two [-1,1] floats (mirror of the GPU unpackSnorm2x16;
 * -32768 clamps to -1).
 * @param {number} word Source word.
 * @param {number[]} [out] Optional 2-element target.
 * @returns {number[]} [x, y] in [-1,1].
 */
export function pkUnpackSnorm2x16(word, out) {
  const o = out || [0, 0];
  o[0] = clamp11(pkS16(word, 0) / 32767);
  o[1] = clamp11(pkS16(word, 1) / 32767);
  return o;
}

/**
 * [0,1] rgba -> 10/10/10/2 unorm word for a UBO uint member.
 * GLSL decode: pkUnpackRgb10A2. (For textures use the rgba16f/rgb10_a2
 * \`@output\` formats instead — no packed-1010102 upload path exists.)
 * @param {number} r Red, clamped to [0,1] (10 bits).
 * @param {number} g Green, clamped to [0,1] (10 bits).
 * @param {number} b Blue, clamped to [0,1] (10 bits).
 * @param {number} a Alpha, clamped to [0,1] (2 bits).
 * @returns {number} The packed word.
 */
export function pkPackRgb10A2(r, g, b, a) {
  return (
    (Math.floor(clamp01(r) * 1023 + 0.5) |
      (Math.floor(clamp01(g) * 1023 + 0.5) << 10) |
      (Math.floor(clamp01(b) * 1023 + 0.5) << 20) |
      (Math.floor(clamp01(a) * 3 + 0.5) << 30)) >>>
    0
  );
}

/**
 * 10/10/10/2 unorm word -> [0,1] rgba.
 * GLSL twin: pkUnpackRgb10A2.
 * @param {number} word Source word.
 * @param {number[]} [out] Optional 4-element target.
 * @returns {number[]} [r, g, b, a] in [0,1].
 */
export function pkUnpackRgb10A2(word, out) {
  const o = out || [0, 0, 0, 0];
  o[0] = (word & 0x3ff) / 1023;
  o[1] = ((word >>> 10) & 0x3ff) / 1023;
  o[2] = ((word >>> 20) & 0x3ff) / 1023;
  o[3] = (word >>> 30) / 3;
  return o;
}

// ────────────────────────────────────────────────────────────── half floats
// IEEE 754 binary16 ⇄ binary32, inlined (the dual-use purity rule forbids
// importing the engine's environmentMap/half.ts codec; packing.test.ts sweeps
// this one against it as an oracle — same semantics: round-to-nearest-even,
// subnormals, ±Inf saturation, canonical quiet NaN 0x7e00). Carried in UBO
// uint members via pkPackHalf2x16 and decoded GPU-side with the NATIVE
// unpackHalf2x16 built-in.

// Scratch views for reinterpreting a number's binary32 bits. Module-level
// (reused across calls) — observable behaviour stays pure.
const _f32 = new Float32Array(1);
const _u32 = new Uint32Array(_f32.buffer);

/**
 * One binary32 value -> its binary16 bit pattern.
 * @param {number} value The float.
 * @returns {number} The half bits, 0..0xffff.
 */
export function pkFloatToHalfBits(value) {
  _f32[0] = value;
  const x = _u32[0];
  const sign = (x >>> 16) & 0x8000;
  const exp = (x >>> 23) & 0xff;
  const mant = x & 0x007fffff;
  if (exp === 0xff) return sign | (mant ? 0x7e00 : 0x7c00); // NaN / ±Inf
  const e = exp - 112; // rebias 127 -> 15
  if (e >= 0x1f) return sign | 0x7c00; // overflow -> ±Inf
  if (e <= 0) {
    if (e < -10) return sign; // underflow -> signed zero
    const m = mant | 0x00800000;
    const shift = 14 - e;
    const half = m >>> shift;
    const remainder = m & ((1 << shift) - 1);
    const halfway = 1 << (shift - 1);
    if (remainder > halfway || (remainder === halfway && (half & 1) === 1)) {
      return sign | (half + 1);
    }
    return sign | half;
  }
  const half = (e << 10) | (mant >>> 13);
  const remainder = mant & 0x1fff;
  if (remainder > 0x1000 || (remainder === 0x1000 && (half & 1) === 1)) {
    return sign | (half + 1);
  }
  return sign | half;
}

/**
 * One binary16 bit pattern -> the binary32 value it denotes.
 * @param {number} bits The half bits, 0..0xffff.
 * @returns {number} The float.
 */
export function pkHalfBitsToFloat(bits) {
  const sign = bits & 0x8000 ? -1 : 1;
  const exp = (bits >>> 10) & 0x1f;
  const mant = bits & 0x03ff;
  if (exp === 0) return sign * mant * 2 ** -24; // subnormal (±0 when mant=0)
  if (exp === 0x1f) return mant ? NaN : sign * Infinity;
  return sign * (1024 + mant) * 2 ** (exp - 25);
}

/**
 * Bulk binary32 -> binary16: convert a whole Float32Array into the Uint16Array
 * of half bit patterns an \`r16f\` / \`rg16f\` / \`rgba16f\` \`@output\` upload wants
 * (\`upload(halves)\` picks HALF_FLOAT up automatically — see UploadOpts.sourceType).
 * Halves the CPU copy versus letting the driver re-quantise a Float32Array.
 * @param {Float32Array|number[]} src Source values.
 * @param {Uint16Array} [dst] Optional target, reused across frames; must be at
 *   least \`src.length\` long. Allocated when omitted.
 * @returns {Uint16Array} \`dst\` (or the freshly allocated array).
 */
export function pkPackHalfArray(src, dst) {
  const n = src.length;
  const out = dst || new Uint16Array(n);
  for (let i = 0; i < n; i++) out[i] = pkFloatToHalfBits(src[i]);
  return out;
}

/**
 * Bulk binary16 -> binary32 (round-trip mirror of pkPackHalfArray).
 * @param {Uint16Array|number[]} src Half bit patterns.
 * @param {Float32Array} [dst] Optional target, at least \`src.length\` long.
 * @returns {Float32Array} \`dst\` (or the freshly allocated array).
 */
export function pkUnpackHalfArray(src, dst) {
  const n = src.length;
  const out = dst || new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = pkHalfBitsToFloat(src[i]);
  return out;
}

/**
 * Two floats -> a word of two halves; a lands in the low half.
 * GPU decode: the NATIVE unpackHalf2x16 built-in (or pkUnpackHalf4x16 for a
 * uvec2 pair).
 * @param {number} a Lane 0 (low half).
 * @param {number} b Lane 1 (high half).
 * @returns {number} The packed word.
 */
export function pkPackHalf2x16(a, b) {
  return (pkFloatToHalfBits(a) | (pkFloatToHalfBits(b) << 16)) >>> 0;
}

/**
 * A word of two halves -> two floats (CPU mirror of the GPU unpackHalf2x16).
 * @param {number} word Source word.
 * @param {number[]} [out] Optional 2-element target.
 * @returns {number[]} [a, b].
 */
export function pkUnpackHalf2x16(word, out) {
  const o = out || [0, 0];
  o[0] = pkHalfBitsToFloat(word & 0xffff);
  o[1] = pkHalfBitsToFloat(word >>> 16);
  return o;
}

/**
 * Four floats -> two words of halves ([xy word, zw word], for a uvec2 UBO
 * member). GLSL twin: pkUnpackHalf4x16 / pkPackHalf4x16.
 * @param {number} x Lane 0.
 * @param {number} y Lane 1.
 * @param {number} z Lane 2.
 * @param {number} w Lane 3.
 * @param {number[]} [out] Optional 2-element target.
 * @returns {number[]} [packHalf2x16(x,y), packHalf2x16(z,w)].
 */
export function pkPackHalf4x16(x, y, z, w, out) {
  const o = out || [0, 0];
  o[0] = pkPackHalf2x16(x, y);
  o[1] = pkPackHalf2x16(z, w);
  return o;
}

/**
 * Two words of halves -> four floats.
 * GLSL twin: pkUnpackHalf4x16.
 * @param {number} wordXY Word holding lanes x (low) and y (high).
 * @param {number} wordZW Word holding lanes z (low) and w (high).
 * @param {number[]} [out] Optional 4-element target.
 * @returns {number[]} [x, y, z, w].
 */
export function pkUnpackHalf4x16(wordXY, wordZW, out) {
  const o = out || [0, 0, 0, 0];
  o[0] = pkHalfBitsToFloat(wordXY & 0xffff);
  o[1] = pkHalfBitsToFloat(wordXY >>> 16);
  o[2] = pkHalfBitsToFloat(wordZW & 0xffff);
  o[3] = pkHalfBitsToFloat(wordZW >>> 16);
  return o;
}

// ─────────────────────────────────────────────────── float-carried integers
// A float UBO member or an r32f/rgba32f texel carries an integer EXACTLY only
// below 2^24. Pack fields with pkInsert, gate the result through pkExactFloat
// once while authoring, and decode GPU-side with pkFieldFromFloat (which
// converts the float to an integer ONCE and then shift/masks — never decode
// with float division and mod).

/** The first integer a binary32 float can NOT represent exactly (2^24). */
export const PK_MAX_EXACT = 16777216;

/**
 * Assert a packed word survives a float carrier exactly. Throws RangeError
 * for negatives, non-integers, and values >= 2^24 — fail-fast while
 * authoring; validated hot loops can skip it and use pkInsert directly.
 * @param {number} u The packed word.
 * @returns {number} u, unchanged.
 */
export function pkExactFloat(u) {
  if (!Number.isInteger(u) || u < 0 || u >= PK_MAX_EXACT) {
    throw new RangeError(
      \`pkExactFloat: \${u} does not survive a float carrier (need an integer in [0, 2^24))\`,
    );
  }
  return u;
}

/**
 * Recover a packed integer from a float lane (readback mirror of the GLSL
 * pkIntFromFloat; rounds half toward +inf).
 * @param {number} v Float-carried value.
 * @returns {number} The integer.
 */
export function pkIntFromFloat(v) {
  return Math.floor(v + 0.5);
}

/**
 * Unsigned bitfield straight out of a float-carried word.
 * GLSL twin: pkFieldFromFloat.
 * @param {number} v Float-carried word, >= 0.
 * @param {number} off Bit offset of the field's low bit.
 * @param {number} bits Field width in bits.
 * @returns {number} The field, right-aligned.
 */
export function pkFieldFromFloat(v, off, bits) {
  return pkExtractU(pkIntFromFloat(v), off, bits);
}

/**
 * Signed bitfield straight out of a float-carried word.
 * GLSL twin: pkSFieldFromFloat.
 * @param {number} v Float-carried word, >= 0.
 * @param {number} off Bit offset of the field's low bit.
 * @param {number} bits Field width in bits, >= 1.
 * @returns {number} The field, sign-extended.
 */
export function pkSFieldFromFloat(v, off, bits) {
  return pkExtractS(pkIntFromFloat(v), off, bits);
}

// ──────────────────────────────────────────────── rgba8 texel writers
// For \`@output <name> rgba8\` script textures: write into the Uint8Array you
// pass to outputs.<name>.upload(). Byte order is little-endian — the low byte
// lands in R — which is exactly what the GLSL pkWordFromUnorm4 reassembles.

/**
 * Write a 32-bit word into texel \`texelIndex\` of an rgba8 pixel buffer
 * (low byte -> R, high byte -> A). GLSL decode: pkWordFromUnorm4.
 * @param {Uint8Array|Uint8ClampedArray} u8 The rgba8 pixel buffer.
 * @param {number} texelIndex Texel index (row-major).
 * @param {number} word The packed word.
 * @returns {void}
 */
export function pkWriteU32ToRGBA8(u8, texelIndex, word) {
  const base = texelIndex << 2;
  u8[base] = word & 0xff;
  u8[base + 1] = (word >>> 8) & 0xff;
  u8[base + 2] = (word >>> 16) & 0xff;
  u8[base + 3] = (word >>> 24) & 0xff;
}

/**
 * Read back the 32-bit word behind texel \`texelIndex\` of an rgba8 pixel
 * buffer (round-trip mirror of pkWriteU32ToRGBA8).
 * @param {Uint8Array|Uint8ClampedArray} u8 The rgba8 pixel buffer.
 * @param {number} texelIndex Texel index (row-major).
 * @returns {number} The packed word.
 */
export function pkReadU32FromRGBA8(u8, texelIndex) {
  const base = texelIndex << 2;
  return pkPackU8x4(u8[base], u8[base + 1], u8[base + 2], u8[base + 3]);
}

/**
 * Write four [0,1] floats as unorm bytes into texel \`texelIndex\` of an rgba8
 * pixel buffer. GLSL decode: ordinary sampling, or pkBytesFromUnorm4 for the
 * exact bytes.
 * @param {Uint8Array|Uint8ClampedArray} u8 The rgba8 pixel buffer.
 * @param {number} texelIndex Texel index (row-major).
 * @param {number} x R in [0,1] (clamped).
 * @param {number} y G in [0,1] (clamped).
 * @param {number} z B in [0,1] (clamped).
 * @param {number} w A in [0,1] (clamped).
 * @returns {void}
 */
export function pkWriteUnorm4(u8, texelIndex, x, y, z, w) {
  const base = texelIndex << 2;
  u8[base] = pkUnormByte(x);
  u8[base + 1] = pkUnormByte(y);
  u8[base + 2] = pkUnormByte(z);
  u8[base + 3] = pkUnormByte(w);
}
`,n=`// text.js — CPU text layout + instance-stream writers, the engine script library
// behind
//
//     import { textLayout, textBuffers, textWriteString } from 'zed:text.js';
//
// available in every script / data-script / canvas script with no setup (an
// engine-provided \`zed:\` module; a project script named \`text.js\` shadows it,
// mirroring how a project GLSL snippet shadows an engine include). It is the CPU
// half of the MSDF text runtime; the GPU half is the <msdf-text> include family
// (src/lib/shaders/text/msdfTextGlsl.ts). Full spec: docs/msdf-text-rendering.md
// §3.3.
//
// Layout runs on the CPU (this library): kerning, wrapping, alignment, ellipsis.
// The GPU never sees the glyph metrics table — the writers resolve every glyph
// to atlas UVs + quad geometry and pack them into the four @output instance
// textures (glyphPos / glyphQuad / glyphUV + a styles palette).
//
// This file is DUAL-USE, packing.js style — imported directly by vitest AND
// served verbatim as module source at script compile time. HARD constraints:
//   * NO \`import\` / \`require\` — fully self-contained (the bit-pinned packing
//     helper below is an internal copy of packing.js's pkPackU8x4; text.test.ts
//     cross-checks the two are identical).
//   * NO TypeScript syntax — plain JS + JSDoc types only (tsconfig \`checkJs\`).
//   * NO host/DOM/global access — pure + deterministic.

/**
 * @typedef {Object} MsdfGlyphMetrics
 * @property {number[]} uv     u0 v0 u1 v1 (the inflated cell).
 * @property {number[]} plane  l b r t, em, baseline-relative (the same cell).
 * @property {number} advance  advance width, em.
 */
/**
 * @typedef {Object} MsdfFontMetrics
 * @property {string} name
 * @property {number} cellPx
 * @property {string} atlasTexture
 * @property {number} ascent
 * @property {number} descent
 * @property {number} lineHeight
 * @property {number} capHeight
 * @property {Object<number, MsdfGlyphMetrics>} glyphs
 * @property {ReadonlyArray<ReadonlyArray<number>>} kerning  [cpA, cpB, amountEm]
 */
/**
 * @typedef {Object} LayoutGlyph
 * @property {number} cp
 * @property {number} x  quad bottom-left x (layout units, baseline-relative)
 * @property {number} y  quad bottom-left y (layout units, y-up)
 * @property {number} w
 * @property {number} h
 * @property {number} u0 @property {number} v0 @property {number} u1 @property {number} v1
 */

// ─────────────────────────────────────────────────── control-word packing
// Internal copy of packing.js's pkPackU8x4 (the dual-use no-import rule forbids
// importing it). text.test.ts pins the two identical.

/**
 * Pack four unsigned bytes into a word; b0 lands in the low byte.
 * @param {number} b0 @param {number} b1 @param {number} b2 @param {number} b3
 * @returns {number}
 */
function packU8x4(b0, b1, b2, b3) {
  return ((b0 & 0xff) | ((b1 & 0xff) << 8) | ((b2 & 0xff) << 16) | ((b3 & 0xff) << 24)) >>> 0;
}

// ───────────────────────────────────────────────────────────── digest
/**
 * A stable 32-bit FNV-1a digest over the string/number parts — for change
 * detection in dynamic writers (D10). Deterministic and cheap.
 * @param {...(string|number)} parts
 * @returns {string} hex digest
 */
export function textDigest(...parts) {
  let h = 0x811c9dc5;
  const s = parts.join('');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

// ───────────────────────────────────────────────────────────── layout
const LAYOUT_CACHE = new Map();
const LAYOUT_CACHE_CAP = 64;

/** @param {MsdfFontMetrics} metrics @returns {Map<number, number>} kern lookup */
function kernMap(metrics) {
  const m = new Map();
  const k = metrics.kerning || [];
  for (let i = 0; i < k.length; i++) {
    m.set(k[i][0] * 0x110000 + k[i][1], k[i][2]);
  }
  return m;
}

/**
 * Lay out one line's codepoints into placed glyphs (no wrapping). Returns the
 * glyph records plus the pen advance width, in layout units.
 * @param {MsdfFontMetrics} metrics
 * @param {number[]} cps
 * @param {number} size
 * @param {number} letterSpacing
 * @param {boolean} kerning
 * @param {Map<number, number>} kerns
 * @returns {{ glyphs: LayoutGlyph[], width: number, missing: number }}
 */
function layoutLine(metrics, cps, size, letterSpacing, kerning, kerns) {
  const glyphs = [];
  let cursor = 0;
  let prev = -1;
  let missing = 0;
  const spaceAdv = metrics.glyphs[32] ? metrics.glyphs[32].advance : 0;
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i];
    const g = metrics.glyphs[cp];
    if (!g) {
      missing++;
      cursor += spaceAdv * size;
      prev = -1;
      continue;
    }
    if (prev >= 0) {
      if (kerning) cursor += (kerns.get(prev * 0x110000 + cp) || 0) * size;
      cursor += letterSpacing * size;
    }
    // Emit a quad only for glyphs with an atlas cell (space has none).
    if (g.uv[2] > g.uv[0]) {
      glyphs.push({
        cp,
        x: cursor + g.plane[0] * size,
        y: g.plane[1] * size,
        w: (g.plane[2] - g.plane[0]) * size,
        h: (g.plane[3] - g.plane[1]) * size,
        u0: g.uv[0],
        v0: g.uv[1],
        u1: g.uv[2],
        v1: g.uv[3],
      });
    }
    cursor += g.advance * size;
    prev = cp;
  }
  return { glyphs, width: cursor, missing };
}

/**
 * Break a codepoint line into sub-lines no wider than \`maxWidth\` at space
 * boundaries (greedy). Only used for overflow === 'wrap'.
 * @param {MsdfFontMetrics} metrics @param {number[]} cps @param {number} size
 * @param {number} letterSpacing @param {boolean} kerning @param {Map<number,number>} kerns
 * @param {number} maxWidth
 * @returns {number[][]}
 */
function wrapLine(metrics, cps, size, letterSpacing, kerning, kerns, maxWidth) {
  const lines = [];
  let start = 0;
  let lastSpace = -1;
  for (let i = 0; i <= cps.length; i++) {
    if (i < cps.length && cps[i] === 32) lastSpace = i;
    const w = layoutLine(metrics, cps.slice(start, i), size, letterSpacing, kerning, kerns).width;
    if (w > maxWidth && i - start > 1) {
      const brk = lastSpace > start ? lastSpace : i - 1;
      lines.push(cps.slice(start, brk));
      start = cps[brk] === 32 ? brk + 1 : brk;
      lastSpace = -1;
      i = start; // rescan from the new line start
    }
  }
  lines.push(cps.slice(start));
  return lines;
}

/**
 * Truncate a codepoint line to fit \`maxWidth\`, appending an ellipsis glyph.
 * @param {MsdfFontMetrics} metrics @param {number[]} cps @param {number} size
 * @param {number} letterSpacing @param {boolean} kerning @param {Map<number,number>} kerns
 * @param {number} maxWidth
 * @returns {number[]}
 */
function ellipsizeLine(metrics, cps, size, letterSpacing, kerning, kerns, maxWidth) {
  const dot = metrics.glyphs[0x2026] ? 0x2026 : 0x2e; // '…' if baked, else '.'
  if (layoutLine(metrics, cps, size, letterSpacing, kerning, kerns).width <= maxWidth) return cps;
  const out = cps.slice();
  while (out.length > 0) {
    out.pop();
    const test = out.concat([dot]);
    if (layoutLine(metrics, test, size, letterSpacing, kerning, kerns).width <= maxWidth) return test;
  }
  return [dot];
}

/**
 * Lay out \`text\` against a baked font's metrics.
 *
 * The result is in LAYOUT units with the first glyph's origin at x = 0 and the
 * baseline at y = 0 — so the run extends right and (mostly) up from the origin.
 * \`align\` justifies the LINES OF A MULTI-LINE BLOCK against each other
 * (\`shift = (blockWidth − line.width)/…\`) and is therefore a NO-OP for a single
 * line: it does not centre a run on its origin. To place a run relative to its
 * anchor, pass \`place.offset\` to {@link textWriteString}.
 *
 * @param {MsdfFontMetrics} metrics the imported \`msdfFont_<name>.js\` default export.
 * @param {string} text
 * @param {{ size?: number, align?: 'left'|'center'|'right', lineHeight?: number,
 *   letterSpacing?: number, kerning?: boolean, maxWidth?: number,
 *   overflow?: 'none'|'wrap'|'ellipsis' }} [opts]
 * @returns {{ glyphs: LayoutGlyph[], width: number, height: number, lineCount: number, missing: number }}
 */
export function textLayout(metrics, text, opts) {
  const o = opts || {};
  const size = o.size == null ? 1 : o.size;
  const align = o.align || 'left';
  const lineHeight = o.lineHeight == null ? metrics.lineHeight : o.lineHeight;
  const letterSpacing = o.letterSpacing || 0;
  const kerning = o.kerning !== false;
  const overflow = o.overflow || 'none';
  const maxWidth = o.maxWidth;

  const cacheKey = textDigest(
    metrics.name,
    metrics.cellPx,
    text,
    size,
    align,
    lineHeight,
    letterSpacing,
    kerning ? 1 : 0,
    overflow,
    maxWidth == null ? -1 : maxWidth,
  );
  const cached = LAYOUT_CACHE.get(cacheKey);
  if (cached) return cached;

  const kerns = kernMap(metrics);
  // Split on explicit newlines, then wrap/ellipsize per the overflow mode.
  const rawLines = [...text].reduce(
    /** @param {number[][]} acc @param {string} ch */
    (acc, ch) => {
      if (ch === '\\n') acc.push([]);
      else acc[acc.length - 1].push(ch.codePointAt(0) || 0);
      return acc;
    },
    [[]],
  );

  /** @type {number[][]} */
  let lines = [];
  for (const cps of rawLines) {
    if (maxWidth != null && overflow === 'wrap') {
      lines.push(...wrapLine(metrics, cps, size, letterSpacing, kerning, kerns, maxWidth));
    } else if (maxWidth != null && overflow === 'ellipsis') {
      lines.push(ellipsizeLine(metrics, cps, size, letterSpacing, kerning, kerns, maxWidth));
    } else {
      lines.push(cps);
    }
  }

  const laidLines = lines.map((cps) =>
    layoutLine(metrics, cps, size, letterSpacing, kerning, kerns),
  );
  const blockWidth = laidLines.reduce((m, l) => Math.max(m, l.width), 0);

  /** @type {LayoutGlyph[]} */
  const glyphs = [];
  let missing = 0;
  for (let li = 0; li < laidLines.length; li++) {
    const line = laidLines[li];
    missing += line.missing;
    const shift = align === 'center' ? (blockWidth - line.width) / 2 : align === 'right' ? blockWidth - line.width : 0;
    const baselineY = -li * lineHeight * size;
    for (const g of line.glyphs) {
      glyphs.push({ ...g, x: g.x + shift, y: g.y + baselineY });
    }
  }

  const height = ((laidLines.length - 1) * lineHeight + (metrics.ascent - metrics.descent)) * size;
  const result = { glyphs, width: blockWidth, height, lineCount: laidLines.length, missing };

  if (LAYOUT_CACHE.size >= LAYOUT_CACHE_CAP) LAYOUT_CACHE.delete(LAYOUT_CACHE.keys().next().value);
  LAYOUT_CACHE.set(cacheKey, result);
  return result;
}

/**
 * Measured extents of \`text\` (layout without materializing glyph records).
 * @param {MsdfFontMetrics} metrics @param {string} text @param {Object} [opts]
 * @returns {{ width: number, height: number, lineCount: number }}
 */
export function textMeasure(metrics, text, opts) {
  const r = textLayout(metrics, text, opts);
  return { width: r.width, height: r.height, lineCount: r.lineCount };
}

// ───────────────────────────────────────────────────────────── buffers
/**
 * @typedef {Object} TextBuffers
 * @property {Float32Array} pos @property {Float32Array} quad @property {Float32Array} uv
 * @property {Float32Array} styles
 * @property {number} texW @property {number} texH
 * @property {number} stylesW @property {number} stylesH
 * @property {number} maxGlyphs @property {boolean} truncated
 */

/**
 * Allocate the CPU-side Float32Arrays matching the four @output slots. texW/texH
 * and stylesW/stylesH are the dims the script's render-target specs must declare.
 * pos.w defaults to 0 (degenerate) for every texel, so an unwritten buffer emits
 * no glyphs.
 * @param {number} maxGlyphs @param {number} maxStyles @param {number} [width]
 * @returns {TextBuffers}
 */
export function textBuffers(maxGlyphs, maxStyles, width) {
  const texW = width || 512;
  const texH = Math.max(1, Math.ceil(maxGlyphs / texW));
  const stylesH = Math.max(1, maxStyles);
  return {
    pos: new Float32Array(texW * texH * 4),
    quad: new Float32Array(texW * texH * 4),
    uv: new Float32Array(texW * texH * 4),
    styles: new Float32Array(4 * stylesH * 4),
    texW,
    texH,
    stylesW: 4,
    stylesH,
    maxGlyphs,
    truncated: false,
  };
}

/**
 * Write a laid-out string into the buffers starting at \`baseIndex\`. Every glyph
 * shares the run's anchor (place.anchor) with a per-glyph local offset. Returns
 * the next free glyph index; sets buffers.truncated and clamps if maxGlyphs is
 * exceeded (no silent wraparound — edge case 13).
 *
 * \`place.offset\` shifts the whole run in the run's own units, which is how a run
 * is placed relative to its anchor: a layout puts the first glyph's origin at
 * x = 0 with the baseline at y = 0, so an unshifted run sits entirely to the EAST
 * of its anchor and almost entirely ABOVE it. \`textLayout\`'s \`align\` does not do
 * this — it justifies the lines of a multi-line block against each other, and is
 * a no-op for a single line. Getting that wrong is invisible in a screen-space
 * HUD (where a few px of offset reads as styling) and glaring on a globe, where
 * a country's name lands half a word east of the country.
 *
 * \`place.scale\` multiplies the laid-out quads (offset is applied AFTER it, so
 * both are in the same final units). It exists for a caller whose size changes
 * every frame — a world-anchored label holding a constant PIXEL height as the
 * camera moves. Re-laying-out per frame would work and would also miss
 * \`textLayout\`'s cache on every call, since the size is part of the cache key:
 * lay out ONCE at size 1 and scale here, and the layout is computed once per
 * string for the lifetime of the run.
 *
 * @param {TextBuffers} buffers @param {number} baseIndex
 * @param {{ glyphs: LayoutGlyph[] }} layout
 * @param {{ anchor: number[], mode?: number, styleIndex?: number, flags?: number,
 *   offset?: number[], scale?: number }} place
 * @returns {number} next free glyph index
 */
export function textWriteString(buffers, baseIndex, layout, place) {
  const mode = place.mode || 0;
  const styleIndex = place.styleIndex || 0;
  const flags = place.flags || 0;
  const ctrl = packU8x4((flags | 1) & 0xff, mode & 0xff, styleIndex & 0xff, 0);
  const ax = place.anchor[0] || 0;
  const ay = place.anchor[1] || 0;
  const az = place.anchor.length > 2 ? place.anchor[2] : 0;
  const ox = place.offset ? place.offset[0] || 0 : 0;
  const oy = place.offset && place.offset.length > 1 ? place.offset[1] || 0 : 0;
  const sc = place.scale === undefined ? 1 : place.scale;
  let idx = baseIndex;
  for (let i = 0; i < layout.glyphs.length; i++) {
    if (idx >= buffers.maxGlyphs) {
      buffers.truncated = true;
      break;
    }
    const g = layout.glyphs[i];
    const o = idx * 4;
    buffers.pos[o] = ax;
    buffers.pos[o + 1] = ay;
    buffers.pos[o + 2] = az;
    buffers.pos[o + 3] = ctrl;
    buffers.quad[o] = g.x * sc + ox;
    buffers.quad[o + 1] = g.y * sc + oy;
    buffers.quad[o + 2] = g.w * sc;
    buffers.quad[o + 3] = g.h * sc;
    buffers.uv[o] = g.u0;
    buffers.uv[o + 1] = g.v0;
    buffers.uv[o + 2] = g.u1;
    buffers.uv[o + 3] = g.v1;
    idx++;
  }
  return idx;
}

/**
 * Clear glyph indices [from, to) to degenerate texels (ctrl = 0 ⇒ the vertex
 * shader emits a clipped vertex, zero fragment cost).
 * @param {TextBuffers} buffers @param {number} from @param {number} to
 * @returns {void}
 */
export function textClearRange(buffers, from, to) {
  const lo = Math.max(0, from | 0);
  const hi = Math.min(buffers.maxGlyphs, to | 0);
  for (let i = lo; i < hi; i++) buffers.pos[i * 4 + 3] = 0;
}

/**
 * Write one style palette row (4 RGBA32F texels, D7). Colours are [r,g,b,a].
 * @param {TextBuffers} buffers @param {number} styleIndex
 * @param {{ fill: number[], outline?: number[], outlineWidthPx?: number,
 *   glow?: number[], glowWidthPx?: number, weightBias?: number, opacity?: number }} style
 * @returns {void}
 */
export function textWriteStyle(buffers, styleIndex, style) {
  const base = styleIndex * 4 * 4; // 4 texels/row, 4 floats/texel
  const fill = style.fill || [0, 0, 0, 0];
  const outline = style.outline || [0, 0, 0, 0];
  const glow = style.glow || [0, 0, 0, 0];
  const s = buffers.styles;
  for (let c = 0; c < 4; c++) s[base + c] = fill[c] || 0;
  for (let c = 0; c < 4; c++) s[base + 4 + c] = outline[c] || 0;
  for (let c = 0; c < 4; c++) s[base + 8 + c] = glow[c] || 0;
  s[base + 12] = style.outlineWidthPx || 0;
  s[base + 13] = style.glowWidthPx || 0;
  s[base + 14] = style.weightBias || 0;
  s[base + 15] = style.opacity == null ? 1 : style.opacity;
}
`,r=`// rgbm.js — CPU-side RGBM HDR encode/decode, the engine script library behind
//
//     import { rgbm16Encode, rgbmEncodeArray /* … */ } from 'zed:rgbm.js';
//
// available in every script / data-script / canvas script with no setup (an
// engine-provided \`zed:\` module; a project script named \`rgbm.js\` shadows it,
// mirroring how a project GLSL snippet shadows an engine include). Its GPU twin
// is the <rgbm> engine library (src/lib/shaders/rgbmGlsl.ts): every export names
// its GLSL counterpart, and rgbm.test.ts pins the two sides bit-identical.
// Full guide with worked examples: docs/rgbm.md.
//
// THIS FILE IS THE SOURCE OF TRUTH. It is written first and the GLSL is
// transcribed from it, function for function — the sdfMath.ts / fieldMath.ts
// discipline. There is no DOM/GL test harness in this repo, so vitest over this
// module is the only place a sign flip, a swapped argument or a mis-copied
// constant can die before it reaches a GPU. Keep the two bodies textually
// parallel: a diff between them should be trivial to read.
//
// This file is DUAL-USE, packing.js style — imported directly by vitest AND
// served verbatim as module source at script compile time. HARD constraints
// (enforced by the rgbm.test.ts "source purity" suite):
//   * NO \`import\` / \`require\` — fully self-contained. That is why the unorm-byte
//     rounding below is a COPY of packing.js's pkUnormByte rather than an import
//     (engine \`zed:\` libs are leaves); rgbm.test.ts pins the copy identical.
//   * NO TypeScript syntax — plain JS + JSDoc types only (tsconfig \`checkJs\`).
//   * NO host/DOM/global-scope access — pure + deterministic.
//
// WHAT RGBM IS. Three normalised channels plus a SHARED multiplier M in alpha,
// carrying HDR radiance through an ordinary \`rgba8\` texture — the cheap stand-in
// for \`rgba16f\`, and the only option where a float target is unavailable. Encode
// divides the colour by a per-texel M; decode multiplies it back:
//
//     encode:  M = ceil(255 · max(r,g,b) / range) / 255 ,  rgb = v / (M · range)
//     decode:  v = rgb · M · range
//
// \`range\` is the maximum representable LINEAR radiance and it means that in
// EVERY variant here, gamma ones included — so \`rgbm16*\` tops out at 16.0
// whether or not a curve is in play. (The 6 of Karis's original post is a
// GAMMA-SPACE multiplier; under his γ = 2.2 it corresponds to \`range\` = 51.5149,
// and under the γ = 2 used by the *G2 functions to \`range\` = 36.)
//
// THREE PROPERTIES ARE LOAD-BEARING, each pinned by a test:
//   * \`ceil\`, never \`round\` or \`floor\`. Rounding UP guarantees M · range >= max,
//     hence rgb <= 1 — exactly what rgba8 stores without clipping. A \`floor\`
//     clips the brightest channel of roughly half the texels, silently.
//   * M is FLOORED at 1/255, so black encodes to (0, 0, 0, 1/255) and decodes to
//     exactly black. The classic formulation divides 0 by 0 here and propagates
//     NaN; this library does not, on either side, and no finite input can
//     produce a non-finite output.
//   * The multiplier is SHARED, so a dark channel beside a bright one is
//     quantised against an ABSOLUTE step of range/255. That is the whole reason
//     the *G2 (gamma) variants exist — see below.
//
// GAMMA. Quantising in linear light spends the 8 bits uniformly, which is the
// wrong distribution for radiance: at range 16 a texel of (16, 0.02, 0.02)
// stores its dark channels as ZERO. Encoding through a curve first makes the
// step relative instead — the same (16, 0.02, 0.02) comes back to within 0.35%,
// and mean relative error over a log-uniform sweep drops from ~26% to ~2%.
// Prefer the *G2 functions (γ = 2: one sqrt out, one multiply back) unless you
// need a specific curve, in which case use rgbmEncodeGamma/rgbmDecodeGamma.
// Three gamma foot-guns:
//   * the curve MUST be applied before M is derived (M is the max of the
//     GAMMA-space channels) — applying it afterwards buys nothing at all;
//   * multiplying an encoded texel's rgb by k scales linear light by k in the
//     linear variants but by k^γ in the gamma ones, so a linear multiplier has
//     to be pre-curved as k^(1/γ);
//   * never hand these bytes to an sRGB texture format — the hardware transfer
//     curve would be a SECOND one on rgb and none on alpha. RGBM needs a linear
//     rgba8.
//
// AND ONE THAT APPLIES TO BOTH: decode is \`rgb · a · range\`, a product of two
// stored channels, so nothing may be interpolated, averaged or blended BEFORE
// decoding. Bilinear filtering, mipmaps and blend hardware all operate on the
// stored channels and are arithmetically wrong on encoded texels — gamma makes
// that less wrong, not right. Sample with \`texelFetch\`, or accept the error
// knowingly.
//
// CONVENTIONS shared with the GPU twin:
//   * \`Math.fround\` after EVERY arithmetic step, mirroring the GLSL expression
//     tree op for op. GPUs compute in f32 and JS numbers are f64; without this
//     the twin test could only assert a tolerance, never exactness.
//   * Rounding to a byte is Math.floor(x · 255 + 0.5) — round-half-toward-+inf,
//     the packing.js convention — because GLSL round() picks its half-way
//     direction per driver.
//   * Scalars in, optional \`out\` array for GC-free hot loops (pkUnpackUnorm4x8
//     shape). Encoders return [r, g, b, a] as unclamped floats; the clip to
//     [0,1] belongs to the STORAGE step, which is what rgbmWriteBytes does.

// ──────────────────────────────────────────────────────── shared constants

const f = Math.fround;

const B255 = f(255);
const INV255 = f(1 / 255);

// Baked scale constants for the 8 and 16 entry points. Both ranges are powers
// of two, so 255/range is EXACTLY representable and the specialised encoders
// are bit-identical to the generic one rather than merely close (pinned).
const UP8 = f(B255 / f(8));
const DN8 = f(f(8) / B255);
const UP16 = f(B255 / f(16));
const DN16 = f(f(16) / B255);

/** @param {number} v @returns {number} v clamped to [1,255] — the M byte range. */
function clampMB(v) {
  return v < 1 ? 1 : v > 255 ? 255 : v;
}

/**
 * Encode one [0,1] float as a unorm byte, clamped, floor(x * 255 + 0.5).
 *
 * Bit-identical to packing.js's pkUnormByte for every FINITE input, and pinned
 * that way by rgbm.test.ts — it is a copy rather than an import because engine
 * \`zed:\` libraries are leaves and may not import each other. It differs on one
 * point deliberately: pkUnormByte's \`clamp01\` passes a NaN straight through and
 * yields a NaN byte, whereas this saturates, so the module stays total. Nothing
 * here can generate a NaN (M is floored at 1/255), so that only ever fires on
 * one the caller supplied.
 *
 * Exported because a caller writing its own storage loop needs the same
 * rounding — GLSL round() picks its half-way direction per driver, so
 * floor(x + 0.5) is what keeps CPU and GPU agreeing.
 * GLSL decode: pkByteFromUnorm, or sampling an rgba8 texture.
 * @param {number} v Value in [0,1] (clamped).
 * @returns {number} The byte, 0-255.
 */
export function rgbmUnormByte(v) {
  if (!(v > 0)) return 0;
  if (v >= 1) return 255;
  return Math.floor(v * 255 + 0.5);
}

/** @param {number[]} [out] @returns {number[]} \`out\`, or a fresh 4-element array. */
function target4(out) {
  return out || [0, 0, 0, 0];
}

// ────────────────────────────────────────────────────────── linear variants

/**
 * Shared linear encode body. \`up\` = 255/range and \`dn\` = range/255 are passed
 * in rather than derived so the 8/16 entry points can bake them as constants —
 * which is the whole of what makes those "optimised": no runtime divide by
 * range, and an exact reciprocal at a power-of-two range.
 * @param {number} r Linear red.
 * @param {number} g Linear green.
 * @param {number} b Linear blue.
 * @param {number} up 255 / range.
 * @param {number} dn range / 255.
 * @param {number[]} [out] Optional 4-element target.
 * @returns {number[]} [r, g, b, M], rgb UNCLAMPED (see the header).
 */
function encLinear(r, g, b, up, dn, out) {
  const cr = f(r);
  const cg = f(g);
  const cb = f(b);
  const m = f(Math.max(f(Math.max(cr, cg)), cb));
  const mb = f(clampMB(f(Math.ceil(f(m * up)))));
  const d = f(mb * dn);
  const o = target4(out);
  o[0] = f(cr / d);
  o[1] = f(cg / d);
  o[2] = f(cb / d);
  o[3] = f(mb * INV255);
  return o;
}

/**
 * Encode linear radiance as RGBM at an arbitrary scale.
 * GLSL twin: rgbmEncode.
 * @param {number} r Linear red.
 * @param {number} g Linear green.
 * @param {number} b Linear blue.
 * @param {number} range Maximum representable linear radiance (> 0).
 * @param {number[]} [out] Optional 4-element target (GC-free hot loops).
 * @returns {number[]} [r, g, b, M]; rgb is unclamped, storage clips it.
 */
export function rgbmEncode(r, g, b, range, out) {
  const rr = f(range);
  return encLinear(r, g, b, f(B255 / rr), f(rr / B255), out);
}

/**
 * Decode an RGBM texel back to linear radiance.
 * GLSL twin: rgbmDecode.
 * @param {number} r Stored red in [0,1].
 * @param {number} g Stored green in [0,1].
 * @param {number} b Stored blue in [0,1].
 * @param {number} a Stored multiplier M in [0,1].
 * @param {number} range Maximum representable linear radiance (> 0).
 * @param {number[]} [out] Optional 3-element target.
 * @returns {number[]} [r, g, b] linear radiance.
 */
export function rgbmDecode(r, g, b, a, range, out) {
  const s = f(f(a) * f(range));
  const o = out || [0, 0, 0];
  o[0] = f(f(r) * s);
  o[1] = f(f(g) * s);
  o[2] = f(f(b) * s);
  return o;
}

// ─────────────────────────────────────────────────── gamma-2 (sqrt) variants

/**
 * Shared γ = 2 encode body. The curve is applied BEFORE M is derived, which is
 * the whole point — see the header.
 * @param {number} r Linear red.
 * @param {number} g Linear green.
 * @param {number} b Linear blue.
 * @param {number} range Maximum representable linear radiance (> 0).
 * @param {number[]} [out] Optional 4-element target.
 * @returns {number[]} [r, g, b, M], rgb UNCLAMPED.
 */
function encG2(r, g, b, range, out) {
  const rr = f(range);
  // max(v, 0) first: sqrt of a negative is NaN, and a negative channel is a
  // legitimate thing for a caller to hand us (an over-corrected filter, say).
  const cr = f(Math.sqrt(f(f(Math.max(f(r), 0)) / rr)));
  const cg = f(Math.sqrt(f(f(Math.max(f(g), 0)) / rr)));
  const cb = f(Math.sqrt(f(f(Math.max(f(b), 0)) / rr)));
  const m = f(Math.max(f(Math.max(cr, cg)), cb));
  const mb = f(clampMB(f(Math.ceil(f(m * B255)))));
  const s = f(B255 / mb);
  const o = target4(out);
  o[0] = f(cr * s);
  o[1] = f(cg * s);
  o[2] = f(cb * s);
  o[3] = f(mb * INV255);
  return o;
}

/**
 * Encode linear radiance as gamma-2 RGBM at an arbitrary scale — the variant to
 * reach for by default (see the header's GAMMA note).
 * GLSL twin: rgbmEncodeG2.
 * @param {number} r Linear red.
 * @param {number} g Linear green.
 * @param {number} b Linear blue.
 * @param {number} range Maximum representable linear radiance (> 0).
 * @param {number[]} [out] Optional 4-element target.
 * @returns {number[]} [r, g, b, M]; rgb is unclamped, storage clips it.
 */
export function rgbmEncodeG2(r, g, b, range, out) {
  return encG2(r, g, b, range, out);
}

/**
 * Decode a gamma-2 RGBM texel back to linear radiance.
 * GLSL twin: rgbmDecodeG2.
 * @param {number} r Stored red in [0,1].
 * @param {number} g Stored green in [0,1].
 * @param {number} b Stored blue in [0,1].
 * @param {number} a Stored multiplier M in [0,1].
 * @param {number} range Maximum representable linear radiance (> 0).
 * @param {number[]} [out] Optional 3-element target.
 * @returns {number[]} [r, g, b] linear radiance.
 */
export function rgbmDecodeG2(r, g, b, a, range, out) {
  const aa = f(a);
  const rr = f(range);
  const tr = f(f(r) * aa);
  const tg = f(f(g) * aa);
  const tb = f(f(b) * aa);
  const o = out || [0, 0, 0];
  o[0] = f(f(tr * tr) * rr);
  o[1] = f(f(tg * tg) * rr);
  o[2] = f(f(tb * tb) * rr);
  return o;
}

// ────────────────────────────────────────────────────── arbitrary-γ variants
// pow() on both sides. Materially more expensive than the sqrt pair for a
// difference well under one quantisation step, so reach for these only when a
// specific curve is required — γ = 2.2 to match a capture, most often.

/**
 * Encode linear radiance as RGBM through an arbitrary gamma curve.
 * GLSL twin: rgbmEncodeGamma.
 * @param {number} r Linear red.
 * @param {number} g Linear green.
 * @param {number} b Linear blue.
 * @param {number} range Maximum representable linear radiance (> 0).
 * @param {number} gamma The curve exponent, > 0 (2 and 2.2 are the usual ones).
 * @param {number[]} [out] Optional 4-element target.
 * @returns {number[]} [r, g, b, M]; rgb is unclamped, storage clips it.
 */
export function rgbmEncodeGamma(r, g, b, range, gamma, out) {
  const rr = f(range);
  const e = f(f(1) / f(gamma));
  const cr = f(Math.pow(f(f(Math.max(f(r), 0)) / rr), e));
  const cg = f(Math.pow(f(f(Math.max(f(g), 0)) / rr), e));
  const cb = f(Math.pow(f(f(Math.max(f(b), 0)) / rr), e));
  const m = f(Math.max(f(Math.max(cr, cg)), cb));
  const mb = f(clampMB(f(Math.ceil(f(m * B255)))));
  const s = f(B255 / mb);
  const o = target4(out);
  o[0] = f(cr * s);
  o[1] = f(cg * s);
  o[2] = f(cb * s);
  o[3] = f(mb * INV255);
  return o;
}

/**
 * Decode an arbitrary-gamma RGBM texel back to linear radiance.
 * GLSL twin: rgbmDecodeGamma.
 * @param {number} r Stored red in [0,1].
 * @param {number} g Stored green in [0,1].
 * @param {number} b Stored blue in [0,1].
 * @param {number} a Stored multiplier M in [0,1].
 * @param {number} range Maximum representable linear radiance (> 0).
 * @param {number} gamma The curve exponent used at encode time, > 0.
 * @param {number[]} [out] Optional 3-element target.
 * @returns {number[]} [r, g, b] linear radiance.
 */
export function rgbmDecodeGamma(r, g, b, a, range, gamma, out) {
  const aa = f(a);
  const rr = f(range);
  const gg = f(gamma);
  const o = out || [0, 0, 0];
  o[0] = f(f(Math.pow(f(Math.max(f(f(r) * aa), 0)), gg)) * rr);
  o[1] = f(f(Math.pow(f(Math.max(f(f(g) * aa), 0)), gg)) * rr);
  o[2] = f(f(Math.pow(f(Math.max(f(f(b) * aa), 0)), gg)) * rr);
  return o;
}

// ───────────────────────────────────────────── scale 8 and 16 (constants baked)
// The generic bodies with \`range\` folded away: no runtime divide by range, no
// uniform to load GPU-side, and — because 8 and 16 are powers of two — an EXACT
// 255/range. rgbm.test.ts asserts each of these is bit-identical to its generic
// counterpart called with the matching range, so they can never quietly drift.

/**
 * rgbmEncode at range 8. GLSL twin: rgbm8Encode.
 * @param {number} r Linear red.
 * @param {number} g Linear green.
 * @param {number} b Linear blue.
 * @param {number[]} [out] Optional 4-element target.
 * @returns {number[]} [r, g, b, M].
 */
export function rgbm8Encode(r, g, b, out) {
  return encLinear(r, g, b, UP8, DN8, out);
}

/**
 * rgbmDecode at range 8. GLSL twin: rgbm8Decode.
 * @param {number} r Stored red in [0,1].
 * @param {number} g Stored green in [0,1].
 * @param {number} b Stored blue in [0,1].
 * @param {number} a Stored multiplier M in [0,1].
 * @param {number[]} [out] Optional 3-element target.
 * @returns {number[]} [r, g, b] linear radiance.
 */
export function rgbm8Decode(r, g, b, a, out) {
  return rgbmDecode(r, g, b, a, 8, out);
}

/**
 * rgbmEncodeG2 at range 8. GLSL twin: rgbm8EncodeG2.
 * @param {number} r Linear red.
 * @param {number} g Linear green.
 * @param {number} b Linear blue.
 * @param {number[]} [out] Optional 4-element target.
 * @returns {number[]} [r, g, b, M].
 */
export function rgbm8EncodeG2(r, g, b, out) {
  return encG2(r, g, b, 8, out);
}

/**
 * rgbmDecodeG2 at range 8. GLSL twin: rgbm8DecodeG2.
 * @param {number} r Stored red in [0,1].
 * @param {number} g Stored green in [0,1].
 * @param {number} b Stored blue in [0,1].
 * @param {number} a Stored multiplier M in [0,1].
 * @param {number[]} [out] Optional 3-element target.
 * @returns {number[]} [r, g, b] linear radiance.
 */
export function rgbm8DecodeG2(r, g, b, a, out) {
  return rgbmDecodeG2(r, g, b, a, 8, out);
}

/**
 * rgbmEncode at range 16 — the classic RGBM16. GLSL twin: rgbm16Encode.
 * @param {number} r Linear red.
 * @param {number} g Linear green.
 * @param {number} b Linear blue.
 * @param {number[]} [out] Optional 4-element target.
 * @returns {number[]} [r, g, b, M].
 */
export function rgbm16Encode(r, g, b, out) {
  return encLinear(r, g, b, UP16, DN16, out);
}

/**
 * rgbmDecode at range 16. GLSL twin: rgbm16Decode.
 * @param {number} r Stored red in [0,1].
 * @param {number} g Stored green in [0,1].
 * @param {number} b Stored blue in [0,1].
 * @param {number} a Stored multiplier M in [0,1].
 * @param {number[]} [out] Optional 3-element target.
 * @returns {number[]} [r, g, b] linear radiance.
 */
export function rgbm16Decode(r, g, b, a, out) {
  return rgbmDecode(r, g, b, a, 16, out);
}

/**
 * rgbmEncodeG2 at range 16. GLSL twin: rgbm16EncodeG2.
 * @param {number} r Linear red.
 * @param {number} g Linear green.
 * @param {number} b Linear blue.
 * @param {number[]} [out] Optional 4-element target.
 * @returns {number[]} [r, g, b, M].
 */
export function rgbm16EncodeG2(r, g, b, out) {
  return encG2(r, g, b, 16, out);
}

/**
 * rgbmDecodeG2 at range 16. GLSL twin: rgbm16DecodeG2.
 * @param {number} r Stored red in [0,1].
 * @param {number} g Stored green in [0,1].
 * @param {number} b Stored blue in [0,1].
 * @param {number} a Stored multiplier M in [0,1].
 * @param {number[]} [out] Optional 3-element target.
 * @returns {number[]} [r, g, b] linear radiance.
 */
export function rgbm16DecodeG2(r, g, b, a, out) {
  return rgbmDecodeG2(r, g, b, a, 16, out);
}

// ──────────────────────────────────────────────────────────── gamma dispatch
// \`gamma\` selects a CODE PATH, it does not parameterise one: 1 runs the linear
// body and 2 runs the sqrt body, so the bulk and byte helpers below are
// bit-identical to the matching scalar function rather than merely equivalent
// (a pow(x, 1/1) would differ from the linear path by up to an ulp).

/**
 * @param {number} r Linear red.
 * @param {number} g Linear green.
 * @param {number} b Linear blue.
 * @param {number} range Maximum representable linear radiance (> 0).
 * @param {number} gamma 1 = linear, 2 = sqrt, anything else = pow.
 * @param {number[]} [out] Optional 4-element target.
 * @returns {number[]} [r, g, b, M].
 */
function encDispatch(r, g, b, range, gamma, out) {
  if (gamma === 1) return rgbmEncode(r, g, b, range, out);
  if (gamma === 2) return encG2(r, g, b, range, out);
  return rgbmEncodeGamma(r, g, b, range, gamma, out);
}

/**
 * @param {number} r Stored red in [0,1].
 * @param {number} g Stored green in [0,1].
 * @param {number} b Stored blue in [0,1].
 * @param {number} a Stored multiplier M in [0,1].
 * @param {number} range Maximum representable linear radiance (> 0).
 * @param {number} gamma 1 = linear, 2 = square, anything else = pow.
 * @param {number[]} [out] Optional 3-element target.
 * @returns {number[]} [r, g, b] linear radiance.
 */
function decDispatch(r, g, b, a, range, gamma, out) {
  if (gamma === 1) return rgbmDecode(r, g, b, a, range, out);
  if (gamma === 2) return rgbmDecodeG2(r, g, b, a, range, out);
  return rgbmDecodeGamma(r, g, b, a, range, gamma, out);
}

// ───────────────────────────────────────────────────────── rgba8 texel access
// For \`@output <name> rgba8\` script textures: write into the Uint8Array you
// pass to outputs.<name>.upload(). The shader decodes with rgbmDecode & co
// after an ordinary sample — but see the header: sample with texelFetch, since
// bilinear filtering of encoded texels is arithmetically wrong.

/**
 * Encode linear radiance straight into texel \`texelIndex\` of an rgba8 pixel
 * buffer. The clip to [0,1] happens here, not in the encoder — that split is
 * deliberate: over-range input pins M at 1 and leaves rgb above 1, and it is
 * the STORE that saturates it.
 * @param {Uint8Array|Uint8ClampedArray} u8 The rgba8 pixel buffer.
 * @param {number} texelIndex Texel index (row-major).
 * @param {number} r Linear red.
 * @param {number} g Linear green.
 * @param {number} b Linear blue.
 * @param {number} range Maximum representable linear radiance (> 0).
 * @param {number} [gamma] 1 = linear (default), 2 = sqrt, else pow.
 * @returns {void}
 */
export function rgbmWriteBytes(u8, texelIndex, r, g, b, range, gamma) {
  const t = encDispatch(r, g, b, range, gamma === undefined ? 1 : gamma, [0, 0, 0, 0]);
  const base = texelIndex << 2;
  u8[base] = rgbmUnormByte(t[0]);
  u8[base + 1] = rgbmUnormByte(t[1]);
  u8[base + 2] = rgbmUnormByte(t[2]);
  u8[base + 3] = rgbmUnormByte(t[3]);
}

/**
 * Read texel \`texelIndex\` of an rgba8 pixel buffer back to linear radiance
 * (round-trip mirror of rgbmWriteBytes).
 * @param {Uint8Array|Uint8ClampedArray} u8 The rgba8 pixel buffer.
 * @param {number} texelIndex Texel index (row-major).
 * @param {number} range Maximum representable linear radiance (> 0).
 * @param {number} [gamma] 1 = linear (default), 2 = square, else pow.
 * @param {number[]} [out] Optional 3-element target.
 * @returns {number[]} [r, g, b] linear radiance.
 */
export function rgbmReadBytes(u8, texelIndex, range, gamma, out) {
  const base = texelIndex << 2;
  return decDispatch(
    u8[base] / 255,
    u8[base + 1] / 255,
    u8[base + 2] / 255,
    u8[base + 3] / 255,
    range,
    gamma === undefined ? 1 : gamma,
    out,
  );
}

// ──────────────────────────────────────────────────────────── bulk converters
// The pkPackHalfArray shape: pass a reusable \`dst\` across frames to stay
// allocation-free. \`srcStride\` lets a packed RGB (3) or RGBA (4) float buffer
// be read without a copy; the alpha of an RGBA source is IGNORED, since alpha
// in the destination is the multiplier.

/**
 * Bulk linear-radiance -> RGBM rgba8 bytes.
 * @param {Float32Array|number[]} src Linear RGB(A) floats.
 * @param {Uint8Array} [dst] Optional target, reused across frames; must hold
 *   4 bytes per texel. Allocated when omitted.
 * @param {number} [range] Maximum representable linear radiance (default 16).
 * @param {number} [gamma] 1 = linear (default), 2 = sqrt, else pow.
 * @param {number} [srcStride] Floats per source texel: 3 (default) or 4.
 * @returns {Uint8Array} \`dst\` (or the freshly allocated array).
 */
export function rgbmEncodeArray(src, dst, range, gamma, srcStride) {
  const stride = srcStride === undefined ? 3 : srcStride;
  const rr = range === undefined ? 16 : range;
  const gg = gamma === undefined ? 1 : gamma;
  const n = Math.floor(src.length / stride);
  const out = dst || new Uint8Array(n * 4);
  const t = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    const s = i * stride;
    encDispatch(src[s], src[s + 1], src[s + 2], rr, gg, t);
    const base = i << 2;
    out[base] = rgbmUnormByte(t[0]);
    out[base + 1] = rgbmUnormByte(t[1]);
    out[base + 2] = rgbmUnormByte(t[2]);
    out[base + 3] = rgbmUnormByte(t[3]);
  }
  return out;
}

/**
 * Bulk RGBM rgba8 bytes -> linear radiance (round-trip mirror of
 * rgbmEncodeArray).
 * @param {Uint8Array|Uint8ClampedArray|number[]} src RGBM bytes, 4 per texel.
 * @param {Float32Array} [dst] Optional target, reused across frames; must hold
 *   \`dstStride\` floats per texel. Allocated when omitted.
 * @param {number} [range] Maximum representable linear radiance (default 16).
 * @param {number} [gamma] 1 = linear (default), 2 = square, else pow.
 * @param {number} [dstStride] Floats per destination texel: 3 (default) or 4.
 *   With 4, alpha is written as 1.
 * @returns {Float32Array} \`dst\` (or the freshly allocated array).
 */
export function rgbmDecodeArray(src, dst, range, gamma, dstStride) {
  const stride = dstStride === undefined ? 3 : dstStride;
  const rr = range === undefined ? 16 : range;
  const gg = gamma === undefined ? 1 : gamma;
  const n = src.length >> 2;
  const out = dst || new Float32Array(n * stride);
  const t = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const base = i << 2;
    decDispatch(src[base] / 255, src[base + 1] / 255, src[base + 2] / 255, src[base + 3] / 255, rr, gg, t);
    const d = i * stride;
    out[d] = t[0];
    out[d + 1] = t[1];
    out[d + 2] = t[2];
    if (stride > 3) out[d + 3] = 1;
  }
  return out;
}
`,i=e({ENGINE_SCRIPT_LIBS:()=>a,resolveProjectScript:()=>o}),a={"packing.js":t,"text.js":n,"rgbm.js":r};function o(e,t){return e[t]??a[t]??null}export{o as n,i as t};