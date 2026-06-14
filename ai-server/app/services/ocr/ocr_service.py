# 이미지 품질 점수화 - 이미지 전처리 - ocr 실행 - 필요하면 회전해서 다시 ocr
# ocr 토큰을 줄단위 텍스트로 변환 - 메타데이터 추출 - 약 목록 추출 - resultJson 반환

import json
import logging
from typing import Any

import numpy as np

from app.schemas.ocr import AiOcrRequest, AiOcrResponse
from app.services.ocr.image_preprocessing import assess_image_quality, preprocess_prescription_image
from app.services.ocr.medicine_extractor import extract_medicines
from app.services.ocr.metadata_extractor import extract_metadata
from app.services.ocr.ocr_clients import OcrToken, _extract_tokens, _load_image_from_s3

OCR_ENGINE_NAME = "google-vision-document-text-detection"
logger = logging.getLogger(__name__)

def analyze_prescription(request: AiOcrRequest) -> AiOcrResponse:
    image_array = _load_image_from_s3(request.imageKey)  # S3에서 이미지 불러오기
    image_quality = assess_image_quality(image_array)   # 이미지 품질 점수화
    preprocessed_image = preprocess_prescription_image(image_array)  # 이미지 전처리

    all_tokens, orientation_info = _extract_tokens_with_orientation_fallback(preprocessed_image)  # OCR 호출해서 텍스트를 토큰 단위로 추출
    confidence_summary = _summarize_token_confidence(all_tokens)   # OCR이 읽은 글자/단어 결과를 얼마나 믿을 수 있는지 요약
    structured_result = _build_structured_result(all_tokens)  # OCR로 읽은 전체 토큰을 최종 구조화 결과로 변환
    raw_text = "\n".join(_tokens_to_lines(all_tokens))

    # 최종 결과를 JSON 문자열로
    result_json = json.dumps(
        {
            "ocrResultId": request.ocrResultId,
            "userId": request.userId,
            "imageKey": request.imageKey,
            "imageQuality": image_quality,
            "ocrOrientation": orientation_info,
            "ocrConfidence": confidence_summary,
            **structured_result,
        },
        ensure_ascii=False,
    )

    # ocr 디버깅
    logger.info(
        "OCR completed | ocrResultId=%s userId=%s engine=%s imageQuality=%s orientation=%s confidence=%s rawText=%s resultJson=%s",
        request.ocrResultId,
        request.userId,
        OCR_ENGINE_NAME,
        image_quality,
        orientation_info,
        confidence_summary,
        raw_text,
        result_json
    )
    print(
        "OCR raw text debug | "
        f"ocrResultId={request.ocrResultId} | "
        f"userId={request.userId} | "
        f"engine={OCR_ENGINE_NAME} | "
        f"imageQuality={image_quality} | "
        f"orientation={orientation_info} | "
        f"confidence={confidence_summary}\n"
        f"{raw_text}\n"
        "OCR structured result debug | "
        f"{result_json}",
        flush=True,
    )

    return AiOcrResponse(
        resultJson=result_json,
    )

# ocr 방향 보정용 함수 (각도 변화)
def _extract_tokens_with_orientation_fallback(image: np.ndarray) -> tuple[list[OcrToken], dict[str, Any]]:
    initial_tokens = _extract_tokens(image)
    initial_score = _score_ocr_tokens(initial_tokens)
    if _is_good_enough_ocr(initial_tokens, initial_score):
        return initial_tokens, {
            "rotation": 0,
            "score": initial_score,
            "triedRotations": "0",
        }

    candidates: list[tuple[int, list[OcrToken], int]] = [(0, initial_tokens, initial_score)]
    for rotation in (90, 180, 270):
        rotated = _rotate_image(image, rotation)
        tokens = _extract_tokens(rotated)
        candidates.append((rotation, tokens, _score_ocr_tokens(tokens)))

    best_rotation, best_tokens, best_score = max(candidates, key=lambda item: item[2])
    return best_tokens, {
        "rotation": best_rotation,
        "score": best_score,
        "triedRotations": ",".join(str(candidate[0]) for candidate in candidates),
    }

# 첫 OCR 결과가 충분히 좋은지 판단하는 기준 함수
def _is_good_enough_ocr(tokens: list[OcrToken], score: int) -> bool:
    if len(tokens) >= 35 and score >= 80:
        return True
    if len(tokens) >= 70 and score >= 60:
        return True
    return False

# OCR 결과의 품질을 점수화
def _score_ocr_tokens(tokens: list[OcrToken]) -> int:
    if not tokens:
        return 0

    text = "".join(token.text for token in tokens)
    keyword_score = 0
    for keyword in ("약품명", "복약", "조제", "환자", "약제비", "투약", "일분", "약국", "병원"):
        if keyword in text:
            keyword_score += 12

    confidence_values = [token.confidence for token in tokens if token.confidence is not None]
    confidence_score = int((sum(confidence_values) / len(confidence_values)) * 30) if confidence_values else 0
    return min(len(tokens), 120) + keyword_score + confidence_score

# 이미지를 실제로 회전하는 함수
def _rotate_image(image: np.ndarray, rotation: int) -> np.ndarray:
    if rotation == 90:
        return np.ascontiguousarray(np.rot90(image, 3))
    if rotation == 180:
        return np.ascontiguousarray(np.rot90(image, 2))
    if rotation == 270:
        return np.ascontiguousarray(np.rot90(image, 1))
    return image

# OCR 신뢰도를 요약하는 함수
def _summarize_token_confidence(tokens: list[OcrToken]) -> dict[str, float | int | None]:
    values = [token.confidence for token in tokens if token.confidence is not None]
    if not values:
        return {
            "tokenCount": len(tokens),
            "avg": None,
            "lowCount": 0,
        }

    low_count = sum(1 for value in values if value < 0.75)
    return {
        "tokenCount": len(tokens),
        "avg": round(sum(values) / len(values), 4),
        "min": round(min(values), 4),
        "lowCount": low_count,
    }

# OCR로 읽은 전체 토큰을 최종 구조화 결과로 변환
def _build_structured_result(all_tokens: list[OcrToken]) -> dict[str, Any]:
    all_lines = _tokens_to_lines(all_tokens)

    metadata = extract_metadata(all_tokens, all_lines)
    medicines = extract_medicines(all_tokens, all_lines)

    return {
        **metadata,
        "medicines": medicines,
    }

# OCR 토큰들을 y좌표 기준으로 묶어서 줄 단위 문자열 목록으로 바꾸는 함수
def _tokens_to_lines(tokens: list[OcrToken], y_tolerance: float = 18) -> list[str]:
    if not tokens:
        return []

    rows = _cluster_rows(tokens, y_tolerance=y_tolerance)
    lines: list[str] = []
    for row in rows:
        row.sort(key=lambda token: token.center_x)
        text = " ".join(token.text for token in row).strip()
        if text:
            lines.append(text)
    return lines


# OCR 토큰들을 같은 행(row)끼리 묶어주는 좌표 기반 그룹 함수
def _cluster_rows(tokens: list[OcrToken], y_tolerance: float) -> list[list[OcrToken]]:
    sorted_tokens = sorted(tokens, key=lambda token: (token.center_y, token.center_x))
    rows: list[list[OcrToken]] = []

    for token in sorted_tokens:
        if not rows:
            rows.append([token])
            continue

        current = rows[-1]
        current_y = sum(item.center_y for item in current) / len(current)
        if abs(token.center_y - current_y) <= y_tolerance:
            current.append(token)
        else:
            rows.append([token])

    return rows


