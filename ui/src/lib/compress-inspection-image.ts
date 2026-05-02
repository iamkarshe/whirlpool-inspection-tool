import imageCompression from "browser-image-compression";

/** Target cap for compressed uploads (aligned with ops inspection form limit). */
export const INSPECTION_IMAGE_MAX_UPLOAD_BYTES = 600_000;

export type CompressInspectionImageOptions = {
  /** Rough ceiling for output size; keep below `INSPECTION_IMAGE_MAX_UPLOAD_BYTES`. */
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
};

const DEFAULTS = {
  /** ~576 KB — under `INSPECTION_IMAGE_MAX_UPLOAD_BYTES` while leaving headroom. */
  maxSizeMB: 0.55,
  maxWidthOrHeight: 1500,
  useWebWorker: true,
} as const;

/**
 * Resize / re-encode an image in the browser before uploading to the inspection API.
 * Uses a web worker when supported to avoid blocking the main thread.
 */
export async function compressInspectionImageFile(
  file: File,
  options?: CompressInspectionImageOptions,
): Promise<File> {
  const compressedBlob = await imageCompression(file, {
    maxSizeMB: options?.maxSizeMB ?? DEFAULTS.maxSizeMB,
    maxWidthOrHeight: options?.maxWidthOrHeight ?? DEFAULTS.maxWidthOrHeight,
    useWebWorker: options?.useWebWorker ?? DEFAULTS.useWebWorker,
  });
  return new File([compressedBlob], file.name, {
    type: compressedBlob.type || file.type || "image/jpeg",
    lastModified: Date.now(),
  });
}
