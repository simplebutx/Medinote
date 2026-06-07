import cv2
import numpy as np


def preprocess_prescription_image(image: np.ndarray) -> np.ndarray:
    normalized = _normalize_image(image)
    grayscale = cv2.cvtColor(normalized, cv2.COLOR_RGB2GRAY)

    # Keep document contrast without collapsing thin Korean strokes into harsh binary edges.
    clahe = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(8, 8))
    enhanced = clahe.apply(grayscale)

    denoised = cv2.fastNlMeansDenoising(enhanced, None, 8, 7, 21)

    # A light unsharp mask improves legibility while preserving character shapes.
    blurred = cv2.GaussianBlur(denoised, (0, 0), 1.2)
    sharpened = cv2.addWeighted(denoised, 1.25, blurred, -0.25, 0)

    # Upscale slightly so OCR has more pixels to work with on small printed text.
    resized = cv2.resize(sharpened, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)

    return cv2.cvtColor(resized, cv2.COLOR_GRAY2RGB)


def _normalize_image(image: np.ndarray) -> np.ndarray:
    if image.dtype != np.uint8:
        image = np.clip(image, 0, 255).astype(np.uint8)

    if image.ndim == 2:
        return cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)

    if image.ndim == 3 and image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)

    return image
