"""Image normalisation: HEIC→JPEG, EXIF orientation, resize.

Claude vision works best with JPEG/PNG and a longest side <= 1568 px. iPhone
photos are usually HEIC and carry EXIF rotation; both are handled here.
"""

from __future__ import annotations

import io

from PIL import Image, ImageOps
import pillow_heif

# Make Pillow understand HEIC/HEIF
pillow_heif.register_heif_opener()

from settings import settings


def normalize(raw: bytes, *, max_side: int | None = None) -> tuple[bytes, str]:
    """Returns (jpeg_bytes, "image/jpeg")."""
    max_side = max_side or settings.MAX_IMAGE_LONGEST_SIDE

    img = Image.open(io.BytesIO(raw))
    img = ImageOps.exif_transpose(img)  # apply rotation
    img = img.convert("RGB")  # drop alpha

    w, h = img.size
    longest = max(w, h)
    if longest > max_side:
        scale = max_side / longest
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue(), "image/jpeg"
