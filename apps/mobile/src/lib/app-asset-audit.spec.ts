import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import {
  type ContentExtent,
  type PngHeader,
  androidSafeZoneRadius,
  auditAdaptiveIcon,
  auditStoreIcon,
  channelsPerPixel,
  hasAlphaChannel,
  isPng,
  measureContentExtent,
  readPngHeader,
} from './app-asset-audit';

// Vitest runs with the package root as its working directory, the same
// convention the shared feature-file paths in README.md rely on.
const ASSETS_DIR = join(process.cwd(), 'assets');

const ICON_PATH = join(ASSETS_DIR, 'icon.png');

const ADAPTIVE_ICON_PATH = join(ASSETS_DIR, 'adaptive-icon.png');

// A rasterised mark carries a soft anti-aliased edge several pixels wide. Those
// pixels are barely visible, so counting them as artwork makes the safe-zone
// check fail on a mark that is actually inside it. Only pixels at least half
// opaque count as drawn.
const ALPHA_CONTENT_THRESHOLD = 128;

const OPAQUE_CONTENT_THRESHOLD = 12;

interface DecodedPng {
  header: PngHeader;
  channels: number;
  pixels: Uint8Array;
}

function buildHeaderBytes(width: number, height: number, colourType: number): Uint8Array {
  const bytes = new Uint8Array(26);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  bytes.set([(width >>> 24) & 0xff, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff], 16);
  bytes.set(
    [(height >>> 24) & 0xff, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff],
    20
  );
  bytes[24] = 8;
  bytes[25] = colourType;
  return bytes;
}

function byteAt(bytes: Uint8Array, index: number): number {
  const value = bytes[index];
  if (value === undefined) {
    throw new Error(`Byte ${index} is out of range`);
  }
  return value;
}

function collectIdat(bytes: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let offset = 8;
  let total = 0;
  while (offset + 8 <= bytes.length) {
    const length =
      byteAt(bytes, offset) * 0x1000000 +
      byteAt(bytes, offset + 1) * 0x10000 +
      byteAt(bytes, offset + 2) * 0x100 +
      byteAt(bytes, offset + 3);
    const type = String.fromCharCode(
      byteAt(bytes, offset + 4),
      byteAt(bytes, offset + 5),
      byteAt(bytes, offset + 6),
      byteAt(bytes, offset + 7)
    );
    if (type === 'IDAT') {
      const chunk = bytes.subarray(offset + 8, offset + 8 + length);
      chunks.push(chunk);
      total += chunk.length;
    }
    if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  const joined = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    joined.set(chunk, cursor);
    cursor += chunk.length;
  }
  return joined;
}

function paethPredictor(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceAbove = Math.abs(estimate - above);
  const distanceUpperLeft = Math.abs(estimate - upperLeft);
  if (distanceLeft <= distanceAbove && distanceLeft <= distanceUpperLeft) {
    return left;
  }
  if (distanceAbove <= distanceUpperLeft) {
    return above;
  }
  return upperLeft;
}

/**
 * Minimal decoder for the 8-bit truecolour PNGs the brand pipeline emits. It
 * exists so the audit can walk real pixels without pulling an image library
 * into the mobile dependency tree.
 */
function decodePng(bytes: Uint8Array): DecodedPng {
  const header = readPngHeader(bytes);
  if (header.bitDepth !== 8) {
    throw new Error(`Only 8-bit PNGs are supported, found bit depth ${header.bitDepth}`);
  }
  const channels = channelsPerPixel(header);
  const raw = new Uint8Array(inflateSync(collectIdat(bytes)));
  const stride = header.width * channels;
  const pixels = new Uint8Array(header.height * stride);

  for (let y = 0; y < header.height; y += 1) {
    const filterIndex = y * (stride + 1);
    const filter = byteAt(raw, filterIndex);
    const rowStart = filterIndex + 1;
    for (let index = 0; index < stride; index += 1) {
      const value = byteAt(raw, rowStart + index);
      const left = index >= channels ? byteAt(pixels, y * stride + index - channels) : 0;
      const above = y > 0 ? byteAt(pixels, (y - 1) * stride + index) : 0;
      const upperLeft =
        y > 0 && index >= channels ? byteAt(pixels, (y - 1) * stride + index - channels) : 0;
      let restored = value;
      if (filter === 1) {
        restored = value + left;
      } else if (filter === 2) {
        restored = value + above;
      } else if (filter === 3) {
        restored = value + Math.floor((left + above) / 2);
      } else if (filter === 4) {
        restored = value + paethPredictor(left, above, upperLeft);
      } else if (filter !== 0) {
        throw new Error(`Unsupported PNG filter type ${filter} on row ${y}`);
      }
      pixels[y * stride + index] = restored & 0xff;
    }
  }

  return { header, channels, pixels };
}

function measureTransparencyExtent(decoded: DecodedPng): ContentExtent {
  const { header, channels, pixels } = decoded;
  const stride = header.width * channels;
  return measureContentExtent(header.width, header.height, function isContent(x, y) {
    return byteAt(pixels, y * stride + x * channels + channels - 1) > ALPHA_CONTENT_THRESHOLD;
  });
}

function measureOpaqueExtent(decoded: DecodedPng): ContentExtent {
  const { header, channels, pixels } = decoded;
  const stride = header.width * channels;
  const background = [0, 1, 2].map(function sampleCorner(channel) {
    return channel < channels ? byteAt(pixels, channel) : 0;
  });
  return measureContentExtent(header.width, header.height, function isContent(x, y) {
    const base = y * stride + x * channels;
    for (let channel = 0; channel < Math.min(3, channels); channel += 1) {
      const reference = background[channel];
      if (reference === undefined) {
        continue;
      }
      if (Math.abs(byteAt(pixels, base + channel) - reference) > OPAQUE_CONTENT_THRESHOLD) {
        return true;
      }
    }
    return false;
  });
}

describe('app asset audit', () => {
  it('recognises a PNG signature', () => {
    expect(isPng(buildHeaderBytes(1024, 1024, 2))).toBe(true);
    expect(isPng(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBe(false);
  });

  it('reads width, height and colour type from IHDR', () => {
    const header = readPngHeader(buildHeaderBytes(1024, 768, 6));
    expect(header.width).toBe(1024);
    expect(header.height).toBe(768);
    expect(header.bitDepth).toBe(8);
    expect(header.colourType).toBe(6);
  });

  it('treats truecolour with alpha and greyscale with alpha as carrying alpha', () => {
    expect(hasAlphaChannel(readPngHeader(buildHeaderBytes(8, 8, 6)))).toBe(true);
    expect(hasAlphaChannel(readPngHeader(buildHeaderBytes(8, 8, 4)))).toBe(true);
    expect(hasAlphaChannel(readPngHeader(buildHeaderBytes(8, 8, 2)))).toBe(false);
    expect(hasAlphaChannel(readPngHeader(buildHeaderBytes(8, 8, 0)))).toBe(false);
  });

  it('rejects an icon that is the wrong size or carries alpha', () => {
    const wrongSize = auditStoreIcon(readPngHeader(buildHeaderBytes(512, 512, 2)));
    expect(wrongSize.passed).toBe(false);
    expect(wrongSize.failures).toHaveLength(1);

    const transparent = auditStoreIcon(readPngHeader(buildHeaderBytes(1024, 1024, 6)));
    expect(transparent.passed).toBe(false);
    expect(transparent.failures.join(' ')).toContain('alpha channel');

    const clean = auditStoreIcon(readPngHeader(buildHeaderBytes(1024, 1024, 2)));
    expect(clean.passed).toBe(true);
    expect(clean.failures).toHaveLength(0);
  });

  it('puts the Android safe zone at 72 of 108 units across', () => {
    expect(androidSafeZoneRadius(1024)).toBeCloseTo(341.333, 2);
    expect(androidSafeZoneRadius(108)).toBeCloseTo(36, 5);
  });

  it('measures the bounding box and furthest radius of drawn pixels', () => {
    const extent = measureContentExtent(10, 10, function isContent(x, y) {
      return x >= 2 && x <= 7 && y >= 3 && y <= 6;
    });
    expect(extent.left).toBe(2);
    expect(extent.right).toBe(7);
    expect(extent.top).toBe(3);
    expect(extent.bottom).toBe(6);
    expect(extent.furthestRadius).toBeCloseTo(Math.hypot(2.5, 1.5), 5);
  });

  it('reports no extent when nothing is drawn', () => {
    const extent = measureContentExtent(4, 4, function isContent() {
      return false;
    });
    expect(extent.furthestRadius).toBe(0);
  });

  it('fails an adaptive icon whose artwork leaves the launcher safe zone', () => {
    const header = readPngHeader(buildHeaderBytes(1024, 1024, 6));
    const outside = auditAdaptiveIcon(header, {
      left: 0,
      top: 0,
      right: 1023,
      bottom: 1023,
      furthestRadius: 400,
    });
    expect(outside.passed).toBe(false);
    expect(outside.marginPixels).toBeLessThan(0);
    expect(outside.failures.join(' ')).toContain('safe zone');

    const inside = auditAdaptiveIcon(header, {
      left: 0,
      top: 0,
      right: 1023,
      bottom: 1023,
      furthestRadius: 320,
    });
    expect(inside.passed).toBe(true);
    expect(inside.marginPixels).toBeGreaterThan(0);
  });
});

/**
 * The launcher and store artwork is not on this branch yet, so these cases stay
 * dormant until the assets land and then guard them on every run.
 */
describe.skipIf(!existsSync(ICON_PATH))('shipped iOS icon', () => {
  it('is 1024x1024 with no alpha channel', () => {
    const result = auditStoreIcon(readPngHeader(new Uint8Array(readFileSync(ICON_PATH))));
    expect(result.failures).toEqual([]);
  });

  it('keeps the artwork inside the rounded-rect crop', () => {
    const decoded = decodePng(new Uint8Array(readFileSync(ICON_PATH)));
    const extent = measureOpaqueExtent(decoded);
    expect(extent.furthestRadius).toBeLessThanOrEqual(decoded.header.width / 2);
  });
});

describe.skipIf(!existsSync(ADAPTIVE_ICON_PATH))('shipped Android adaptive icon', () => {
  it('keeps every drawn pixel inside the launcher safe zone', () => {
    const decoded = decodePng(new Uint8Array(readFileSync(ADAPTIVE_ICON_PATH)));
    const extent = measureTransparencyExtent(decoded);
    const result = auditAdaptiveIcon(decoded.header, extent);
    expect(result.failures).toEqual([]);
  });
});
