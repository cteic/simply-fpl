const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const IHDR_OFFSET = 16;

const APPLE_ICON_SIZE = 1024;

const ANDROID_FOREGROUND_DP = 108;

const ANDROID_SAFE_ZONE_DP = 72;

const COLOUR_TYPE_GREYSCALE = 0;
const COLOUR_TYPE_RGB = 2;
const COLOUR_TYPE_PALETTE = 3;
const COLOUR_TYPE_GREYSCALE_ALPHA = 4;
const COLOUR_TYPE_RGBA = 6;

export interface PngHeader {
  width: number;
  height: number;
  bitDepth: number;
  colourType: number;
}

export interface ContentExtent {
  left: number;
  top: number;
  right: number;
  bottom: number;
  furthestRadius: number;
}

export interface IconAuditResult {
  passed: boolean;
  failures: string[];
}

export interface AdaptiveIconAuditResult {
  passed: boolean;
  failures: string[];
  safeZoneRadius: number;
  furthestRadius: number;
  marginPixels: number;
}

export type ContentPredicate = (x: number, y: number) => boolean;

function readUint32BigEndian(bytes: Uint8Array, offset: number): number {
  const a = bytes[offset];
  const b = bytes[offset + 1];
  const c = bytes[offset + 2];
  const d = bytes[offset + 3];
  if (a === undefined || b === undefined || c === undefined || d === undefined) {
    throw new Error(`PNG truncated: no 32-bit value at offset ${offset}`);
  }
  return a * 0x1000000 + b * 0x10000 + c * 0x100 + d;
}

export function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

export function readPngHeader(bytes: Uint8Array): PngHeader {
  if (!isPng(bytes)) {
    throw new Error('Not a PNG file: signature mismatch');
  }
  const bitDepth = bytes[IHDR_OFFSET + 8];
  const colourType = bytes[IHDR_OFFSET + 9];
  if (bitDepth === undefined || colourType === undefined) {
    throw new Error('PNG truncated: IHDR chunk is incomplete');
  }
  return {
    width: readUint32BigEndian(bytes, IHDR_OFFSET),
    height: readUint32BigEndian(bytes, IHDR_OFFSET + 4),
    bitDepth,
    colourType,
  };
}

/**
 * True when the PNG carries a per-pixel alpha channel. App Store Connect
 * rejects an app icon that has one, even when every pixel is fully opaque.
 */
export function hasAlphaChannel(header: PngHeader): boolean {
  return (
    header.colourType === COLOUR_TYPE_RGBA || header.colourType === COLOUR_TYPE_GREYSCALE_ALPHA
  );
}

export function channelsPerPixel(header: PngHeader): number {
  switch (header.colourType) {
    case COLOUR_TYPE_GREYSCALE:
      return 1;
    case COLOUR_TYPE_RGB:
      return 3;
    case COLOUR_TYPE_PALETTE:
      return 1;
    case COLOUR_TYPE_GREYSCALE_ALPHA:
      return 2;
    case COLOUR_TYPE_RGBA:
      return 4;
    default:
      throw new Error(`Unsupported PNG colour type ${header.colourType}`);
  }
}

/**
 * Radius of the circle an Android launcher mask is guaranteed not to crop.
 * The foreground layer is 108dp square and only the central 72dp survives
 * every mask shape, so anything beyond this radius may be cut off.
 */
export function androidSafeZoneRadius(canvasSize: number): number {
  return (canvasSize * (ANDROID_SAFE_ZONE_DP / ANDROID_FOREGROUND_DP)) / 2;
}

/**
 * Bounding box of the drawn artwork plus the distance from the canvas centre
 * to the furthest drawn pixel. The caller decides what counts as drawn, so the
 * same walk serves a transparent foreground and an opaque icon on a flat
 * background.
 */
export function measureContentExtent(
  width: number,
  height: number,
  isContent: ContentPredicate
): ContentExtent {
  const centreX = width / 2;
  const centreY = height / 2;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let furthestRadiusSquared = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isContent(x, y)) {
        continue;
      }
      if (x < left) {
        left = x;
      }
      if (x > right) {
        right = x;
      }
      if (y < top) {
        top = y;
      }
      if (y > bottom) {
        bottom = y;
      }
      const offsetX = x + 0.5 - centreX;
      const offsetY = y + 0.5 - centreY;
      const radiusSquared = offsetX * offsetX + offsetY * offsetY;
      if (radiusSquared > furthestRadiusSquared) {
        furthestRadiusSquared = radiusSquared;
      }
    }
  }

  if (right < 0 || bottom < 0) {
    return { left: 0, top: 0, right: 0, bottom: 0, furthestRadius: 0 };
  }

  return { left, top, right, bottom, furthestRadius: Math.sqrt(furthestRadiusSquared) };
}

/**
 * The two rules App Store Connect enforces on the marketing icon: it must be
 * exactly 1024x1024, and it must not carry an alpha channel.
 */
export function auditStoreIcon(header: PngHeader): IconAuditResult {
  const failures: string[] = [];
  if (header.width !== APPLE_ICON_SIZE || header.height !== APPLE_ICON_SIZE) {
    failures.push(
      `icon must be ${APPLE_ICON_SIZE}x${APPLE_ICON_SIZE}, found ${header.width}x${header.height}`
    );
  }
  if (hasAlphaChannel(header)) {
    failures.push(
      'icon must not carry an alpha channel; App Store Connect rejects transparency even when every pixel is opaque'
    );
  }
  return { passed: failures.length === 0, failures };
}

/**
 * The Android foreground must be square and must keep every drawn pixel inside
 * the launcher safe zone, otherwise a round or squircle mask crops the artwork.
 */
export function auditAdaptiveIcon(
  header: PngHeader,
  extent: ContentExtent
): AdaptiveIconAuditResult {
  const failures: string[] = [];
  if (header.width !== header.height) {
    failures.push(`adaptive icon must be square, found ${header.width}x${header.height}`);
  }
  const safeZoneRadius = androidSafeZoneRadius(header.width);
  const marginPixels = safeZoneRadius - extent.furthestRadius;
  if (marginPixels < 0) {
    failures.push(
      `adaptive icon artwork reaches ${extent.furthestRadius.toFixed(1)}px from centre but the launcher safe zone ends at ${safeZoneRadius.toFixed(1)}px, so a circular mask crops it by ${Math.abs(marginPixels).toFixed(1)}px`
    );
  }
  return {
    passed: failures.length === 0,
    failures,
    safeZoneRadius,
    furthestRadius: extent.furthestRadius,
    marginPixels,
  };
}
