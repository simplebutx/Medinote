import json
import logging
from typing import Any

from app.schemas.ocr import AiOcrRequest, AiOcrResponse
from app.services.ocr.image_preprocessing import preprocess_prescription_image
from app.services.ocr.medicine_extractor import extract_medicines
from app.services.ocr.metadata_extractor import extract_metadata
from app.services.ocr.ocr_clients import OcrToken, _extract_tokens, _load_image_from_s3, _to_png_data_url

OCR_ENGINE_NAME = "google-vision-document-text-detection"
logger = logging.getLogger(__name__)

def analyze_prescription(request: AiOcrRequest) -> AiOcrResponse:
    image_array = _load_image_from_s3(request.imageKey)  # S3에서 이미지 불러오기
    preprocessed_image = preprocess_prescription_image(image_array)  # 이미지 전처리
    preview_data_url = _to_png_data_url(preprocessed_image)  # 이미지 배열을 브라우저 미리보기용 PNG data URL 문자열로 변환

    all_tokens = _extract_tokens(preprocessed_image)  # OCR 호출해서 텍스트를 토큰 단위로 추출
    structured_result = _build_structured_result(all_tokens)  # OCR로 읽은 전체 토큰을 최종 구조화 결과로 변환
    raw_text = "\n".join(_tokens_to_lines(all_tokens))

    # 최종 결과를 JSON 문자열로
    result_json = json.dumps(
        {
            "ocrResultId": request.ocrResultId,
            "userId": request.userId,
            "imageKey": request.imageKey,
            **structured_result,
        },
        ensure_ascii=False,
    )

    # ocr 디버깅 
    logger.info(
        "OCR completed | ocrResultId=%s userId=%s engine=%s rawText=%s resultJson=%s",
        request.ocrResultId,
        request.userId,
        OCR_ENGINE_NAME,
        raw_text,
        result_json
    )

    return AiOcrResponse(
        resultJson=result_json,
    )

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
