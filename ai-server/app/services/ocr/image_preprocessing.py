import cv2
import numpy as np


def preprocess_prescription_image(image: np.ndarray) -> np.ndarray:
    normalized = _normalize_image(image)
    document_image = _warp_document_if_confident(normalized)
    # 흑백화
    grayscale = cv2.cvtColor(document_image, cv2.COLOR_RGB2GRAY)
    deskewed = _deskew_image(grayscale)

    # 대비 강화
    clahe = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(8, 8))
    enhanced = clahe.apply(deskewed)

    # 노이즈 제거
    denoised = cv2.fastNlMeansDenoising(enhanced, None, 8, 7, 21)

    # 글자 경계 또렷하게
    blurred = cv2.GaussianBlur(denoised, (0, 0), 1.2)
    sharpened = cv2.addWeighted(denoised, 1.25, blurred, -0.25, 0)

    # 이미지 확대
    resized = cv2.resize(sharpened, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)

    return cv2.cvtColor(resized, cv2.COLOR_GRAY2RGB)


def assess_image_quality(image: np.ndarray) -> dict[str, float | int | str]:
    normalized = _normalize_image(image)
    grayscale = cv2.cvtColor(normalized, cv2.COLOR_RGB2GRAY)
    height, width = grayscale.shape[:2]
    blur_score = float(cv2.Laplacian(grayscale, cv2.CV_64F).var())
    brightness = float(np.mean(grayscale))
    contrast = float(np.std(grayscale))

    warnings: list[str] = []
    if min(width, height) < 700:
        warnings.append("low_resolution")
    if blur_score < 80:
        warnings.append("blurry")
    if brightness < 75:
        warnings.append("too_dark")
    if brightness > 225:
        warnings.append("too_bright")
    if contrast < 35:
        warnings.append("low_contrast")

    return {
        "width": int(width),
        "height": int(height),
        "blurScore": round(blur_score, 2),
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "warnings": ",".join(warnings),
    }


def _deskew_image(grayscale: np.ndarray) -> np.ndarray:
    _, binary = cv2.threshold(grayscale, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    coords = np.column_stack(np.where(binary > 0))
    if len(coords) < 300:
        return grayscale

    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    if abs(angle) < 0.3 or abs(angle) > 8:
        return grayscale

    height, width = grayscale.shape[:2]
    matrix = cv2.getRotationMatrix2D((width / 2, height / 2), angle, 1.0)
    return cv2.warpAffine(
        grayscale,
        matrix,
        (width, height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


def _warp_document_if_confident(image: np.ndarray) -> np.ndarray:
    grayscale = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(grayscale, (5, 5), 0)
    edges = cv2.Canny(blurred, 60, 180)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return image

    image_area = image.shape[0] * image.shape[1]
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:5]:
        area = cv2.contourArea(contour)
        if area < image_area * 0.35:
            continue

        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) != 4:
            continue

        points = approx.reshape(4, 2).astype(np.float32)
        ordered = _order_points(points)
        width_a = np.linalg.norm(ordered[2] - ordered[3])
        width_b = np.linalg.norm(ordered[1] - ordered[0])
        height_a = np.linalg.norm(ordered[1] - ordered[2])
        height_b = np.linalg.norm(ordered[0] - ordered[3])
        target_width = int(max(width_a, width_b))
        target_height = int(max(height_a, height_b))
        if target_width < 500 or target_height < 500:
            continue

        aspect_ratio = target_width / max(target_height, 1)
        if not 0.35 <= aspect_ratio <= 3.2:
            continue

        destination = np.array(
            [
                [0, 0],
                [target_width - 1, 0],
                [target_width - 1, target_height - 1],
                [0, target_height - 1],
            ],
            dtype=np.float32,
        )
        matrix = cv2.getPerspectiveTransform(ordered, destination)
        return cv2.warpPerspective(image, matrix, (target_width, target_height), borderMode=cv2.BORDER_REPLICATE)

    return image


def _order_points(points: np.ndarray) -> np.ndarray:
    ordered = np.zeros((4, 2), dtype=np.float32)
    point_sum = points.sum(axis=1)
    point_diff = np.diff(points, axis=1)
    ordered[0] = points[np.argmin(point_sum)]
    ordered[2] = points[np.argmax(point_sum)]
    ordered[1] = points[np.argmin(point_diff)]
    ordered[3] = points[np.argmax(point_diff)]
    return ordered


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
