"""Inspection image compression and media I/O (local or S3 via ``MEDIA_TYPE``)."""

from __future__ import annotations

import io

from PIL import Image, ImageOps

from utils.media_storage import build_url, upload_media

__all__ = ["build_url", "compress_image", "upload_media"]


def compress_image(
    image_bytes: bytes,
    *,
    max_edge: int = 1920,
    jpeg_quality: int = 82,
) -> bytes:
    """Re-encode as JPEG with optional downscale. RGB output."""
    with Image.open(io.BytesIO(image_bytes)) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode in ("RGBA", "P"):
            base = Image.new("RGB", im.size, (255, 255, 255))
            mask = im.split()[-1] if im.mode == "RGBA" else None
            base.paste(im, mask=mask)
            im = base
        elif im.mode != "RGB":
            im = im.convert("RGB")
        w, h = im.size
        longest = max(w, h)
        if longest > max_edge:
            scale = max_edge / longest
            im = im.resize(
                (max(1, int(w * scale)), max(1, int(h * scale))),
                Image.Resampling.LANCZOS,
            )
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=jpeg_quality, optimize=True)
        return buf.getvalue()
