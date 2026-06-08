import cv2
import numpy as np


def preprocess_prescription_image(image: np.ndarray) -> np.ndarray:
    normalized = _normalize_image(image)
    # 흑백화
    grayscale = cv2.cvtColor(normalized, cv2.COLOR_RGB2GRAY)

    # 대비 강화
    clahe = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(8, 8))
    enhanced = clahe.apply(grayscale)

    # 노이즈 제거
    denoised = cv2.fastNlMeansDenoising(enhanced, None, 8, 7, 21)

    # 글자 경계 또렷하게
    blurred = cv2.GaussianBlur(denoised, (0, 0), 1.2)
    sharpened = cv2.addWeighted(denoised, 1.25, blurred, -0.25, 0)

    # 이미지 확대
    resized = cv2.resize(sharpened, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)

    return cv2.cvtColor(resized, cv2.COLOR_GRAY2RGB)


def _normalize_image(image: np.ndarray) -> np.ndarray:
    # 픽셀 타입을 uint8로 변환
    if image.dtype != np.uint8:
        image = np.clip(image, 0, 255).astype(np.uint8)

    # 흑백 -> RGB
    if image.ndim == 2:
        return cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)

    # A(투명도) 제거
    if image.ndim == 3 and image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)

    return image
