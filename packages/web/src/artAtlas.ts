/** Metadata for one cleaned frame inside a layered pixel-art atlas. */
export interface AtlasFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  /** Semantic colours retained by the source (fur, belly, eyes, etc.). */
  paletteSlots?: string[];
  /** Interaction geometry in the same logical coordinates as the Canvas room. */
  hit?: { x: number; y: number; width: number; height: number };
}

export interface AtlasManifest {
  version: 1;
  image: string;
  pixelRatio: number;
  frames: Record<string, AtlasFrame>;
}

export interface ArtAtlas {
  manifest: AtlasManifest;
  bitmap: ImageBitmap;
}

const positiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) > 0;

/** Fail loudly in development instead of drawing a subtly shifted or resampled asset. */
export function validateAtlasManifest(value: unknown): AtlasManifest {
  if (!value || typeof value !== "object") throw new Error("atlas manifest must be an object");
  const manifest = value as Partial<AtlasManifest>;
  if (manifest.version !== 1) throw new Error("atlas manifest version must be 1");
  if (typeof manifest.image !== "string" || !manifest.image) throw new Error("atlas image is required");
  if (!positiveInteger(manifest.pixelRatio)) throw new Error("atlas pixelRatio must be a positive integer");
  if (!manifest.frames || typeof manifest.frames !== "object") throw new Error("atlas frames are required");

  for (const [name, frame] of Object.entries(manifest.frames)) {
    if (!frame || typeof frame !== "object") throw new Error(`atlas frame ${name} must be an object`);
    for (const key of ["x", "y", "anchorX", "anchorY"] as const) {
      if (!Number.isInteger(frame[key]) || frame[key] < 0) throw new Error(`atlas frame ${name}.${key} must be a non-negative integer`);
    }
    for (const key of ["width", "height"] as const) {
      if (!positiveInteger(frame[key])) throw new Error(`atlas frame ${name}.${key} must be a positive integer`);
    }
    if (frame.paletteSlots && (!Array.isArray(frame.paletteSlots) || frame.paletteSlots.some((slot) => typeof slot !== "string" || !slot))) {
      throw new Error(`atlas frame ${name}.paletteSlots must contain names`);
    }
    if (frame.hit) {
      for (const key of ["x", "y"] as const) {
        if (!Number.isInteger(frame.hit[key])) throw new Error(`atlas frame ${name}.hit.${key} must be an integer`);
      }
      for (const key of ["width", "height"] as const) {
        if (!positiveInteger(frame.hit[key])) throw new Error(`atlas frame ${name}.hit.${key} must be a positive integer`);
      }
    }
  }
  return manifest as AtlasManifest;
}

/** Load and decode once. Callers keep the returned atlas for the lifetime of the room. */
export async function loadArtAtlas(manifestUrl: string): Promise<ArtAtlas> {
  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error(`could not load atlas manifest (${response.status})`);
  const manifest = validateAtlasManifest(await response.json());
  const imageUrl = new URL(manifest.image, response.url).toString();
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error(`could not load atlas image (${imageResponse.status})`);
  const bitmap = await createImageBitmap(await imageResponse.blob(), {
    premultiplyAlpha: "premultiply",
    colorSpaceConversion: "none",
  });
  return { manifest, bitmap };
}

/** Draw one frame on the logical room grid with no smoothing or fractional destination edges. */
export function drawAtlasFrame(
  context: CanvasRenderingContext2D,
  atlas: ArtAtlas,
  name: string,
  logicalX: number,
  logicalY: number,
  scale: number,
  cameraX = 0,
): boolean {
  const frame = atlas.manifest.frames[name];
  if (!frame) return false;
  const ratio = atlas.manifest.pixelRatio;
  const dx = Math.round((logicalX - frame.anchorX - cameraX) * scale);
  const dy = Math.round((logicalY - frame.anchorY) * scale);
  const dw = Math.round((frame.width / ratio) * scale);
  const dh = Math.round((frame.height / ratio) * scale);
  context.imageSmoothingEnabled = false;
  context.drawImage(atlas.bitmap, frame.x, frame.y, frame.width, frame.height, dx, dy, dw, dh);
  return true;
}
