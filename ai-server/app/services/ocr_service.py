import base64
import io
import json
import os
import re
from dataclasses import dataclass
from typing import Any

import boto3
import numpy as np
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException
from google.cloud import vision
from google.oauth2 import service_account
from PIL import Image

from app.core.config import settings
from app.schemas.ocr import AiOcrRequest, AiOcrResponse
from app.services.image_preprocessing import preprocess_prescription_image

OCR_ENGINE_NAME = "google-vision-document-text-detection"
RECEIPT_REGION_MAX_X = 0.30
RECEIPT_REGION_MAX_Y = 0.94
GUIDE_REGION_MIN_X = 0.28
GUIDE_REGION_MAX_Y = 0.80
SCHEDULE_REGION_MIN_Y = 0.72
HOSPITAL_REGION_MIN_X = 0.24
HOSPITAL_REGION_MAX_X = 0.80
HOSPITAL_REGION_MAX_Y = 0.22
PHARMACY_LABELS = ["상호", "상호명", "약국"]
DISPENSED_DATE_LABELS = ["조제일자"]
MEDICINE_HEADER_LABELS = ["약품명", "품명"]
DOSAGE_HEADER_LABELS = ["투약량", "투약"]
FREQUENCY_HEADER_LABELS = ["횟수"]
DAYS_HEADER_LABELS = ["일수"]
RECEIPT_KEYWORDS = ("조제일자", "상호", "약품명", "투약량", "횟수", "일수", "약국", "영수증")
HOSPITAL_SUFFIXES = ("병원", "의원", "내과", "외과", "이비인후과", "치과", "한의원")
MEDICINE_NAME_HINTS = ("정", "캡슐", "시럽", "현탁", "서방", "mg", "ml", "mL")
NOISE_KEYWORDS = (
    "영수증",
    "계산서",
    "약제비",
    "급여",
    "비급여",
    "본인부담",
    "상한",
    "차등",
    "금액",
    "비용",
    "규정",
    "환자정보",
    "교부번호",
    "병원정보",
)

_ocr_client: vision.ImageAnnotatorClient | None = None
_s3_client: Any | None = None


@dataclass
class OcrToken:
    text: str
    x_min: float
    y_min: float
    x_max: float
    y_max: float

    @property
    def center_x(self) -> float:
        return (self.x_min + self.x_max) / 2

    @property
    def center_y(self) -> float:
        return (self.y_min + self.y_max) / 2

# 이미지 로드 -> 전처리 -> 토큰 추출 -> 구조화 결과 생성 -> JSON 반환
def analyze_prescription(request: AiOcrRequest) -> AiOcrResponse:
    image_array = _load_image_from_s3(request.imageKey)  # S3에서 이미지 불러오기
    preprocessed_image = preprocess_prescription_image(image_array)  # 이미지 전처리

    preview_data_url = _to_png_data_url(preprocessed_image) # 전처리 이미지 미리보기용 data URL 생성
    all_tokens = _extract_tokens(preprocessed_image)  # Google Vision OCR로 토큰 추출 (텍스트+위치 추출)

    structured_result = _build_structured_result(preprocessed_image.shape, all_tokens)  # OCR 토큰을 구조화된 결과로 변환
    raw_text = "\n".join(_tokens_to_lines(all_tokens))  # rawText 생성

    # 최종 분석 결과를 JSON 문자열로
    result_json = json.dumps(
        {
            "ocrResultId": request.ocrResultId,
            "userId": request.userId,
            "imageKey": request.imageKey,
            **structured_result,
        },
        ensure_ascii=False,
    )

    # 최종 응답 반환
    return AiOcrResponse(
        rawText=raw_text,
        resultJson=result_json,
        ocrEngine=OCR_ENGINE_NAME,
        preprocessedImageDataUrl=preview_data_url,
    )


# S3에서 이미지 불러오기
def _load_image_from_s3(image_key: str) -> np.ndarray:
    client = _get_s3_client()

    # .env에 있는 aws 설정값들을 조합해 S3 클라이언트를 만들고 image_key로 실제 이미지 가져오기
    try:
        response = client.get_object(Bucket=settings.aws_s3_bucket, Key=image_key)
        image_bytes = response["Body"].read()
    except (ClientError, BotoCoreError) as exc:
        raise HTTPException(status_code=502, detail=f"Failed to load image from S3: {exc}") from exc

    # S3에서 가져온 이미지 바이트 데이터를 “진짜 이미지 객체”로 열기
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Uploaded image could not be decoded.") from exc

    return np.array(image)

# Google Vision OCR로 토큰 추출 (텍스트+위치 추출) - 모든 글자를 전부 추출함
def _extract_tokens(image_array: np.ndarray) -> list[OcrToken]:
    client = _get_ocr_client()
    image = vision.Image(content=_to_png_bytes(image_array))  # 이미지 배열을 Google Vision용 이미지로 변환
    image_context = vision.ImageContext(language_hints=["ko", "en"])  # OCR 언어 힌트 설정

    # Google Vision OCR 호출
    try:
        response = client.document_text_detection(image=image, image_context=image_context) 
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OCR extraction failed: {exc}") from exc

    if response.error.message:
        raise HTTPException(status_code=502, detail=f"OCR extraction failed: {response.error.message}")

    tokens: list[OcrToken] = []  # 반환할 토큰 리스트 준비
    annotation = response.full_text_annotation  # full_text_annotation: ocr 전체 결과
    if not annotation:
        return tokens

    # OCR 결과 구조를 순회하면서 모든 단어하나하나 꺼냄
    for page in annotation.pages:
        for block in page.blocks:
            for paragraph in block.paragraphs:
                for word in paragraph.words:
                    text = "".join(symbol.text for symbol in word.symbols).strip()  # word 안의 글자들을 합쳐서 텍스트 만들기
                    if not text:
                        continue

                    vertices = word.bounding_box.vertices  # 단어 위치 좌표 가져오기
                    if not vertices:
                        continue

                    xs = [vertex.x or 0 for vertex in vertices]
                    ys = [vertex.y or 0 for vertex in vertices]
                    # OcrToken 생성
                    tokens.append(
                        OcrToken(
                            text=text,
                            x_min=min(xs),
                            y_min=min(ys),
                            x_max=max(xs),
                            y_max=max(ys),
                        )
                    )

    return tokens  # 최종 토큰 리스트 반환

# OCR로 뽑힌 전체 글자들 중에서 필요한 정보만 골라내는 함수
def _build_structured_result(image_shape: tuple[int, ...], all_tokens: list[OcrToken]) -> dict[str, Any]:
    # 이미지 크기 가져오기
    width = image_shape[1]
    height = image_shape[0]

    # OCR 토큰을 위치별로 나눔
    receipt_tokens = [
        token
        for token in all_tokens
        # 왼쪽 영수증 영역으로 보이는 토큰만 따로 모음
        if token.center_x <= width * RECEIPT_REGION_MAX_X 
        and token.center_y <= height * RECEIPT_REGION_MAX_Y
    ]

    # 복약 안내 영역 토큰 분리
    guide_tokens = [
        token
        for token in all_tokens
        if token.center_x >= width * GUIDE_REGION_MIN_X
        and token.center_y <= height * GUIDE_REGION_MAX_Y
    ]

    # 복용 스케줄 영역 토큰 분리
    schedule_tokens = [
        token
        for token in all_tokens
        if token.center_y >= height * SCHEDULE_REGION_MIN_Y
    ]

    # 병원명 후보 영역 분리
    hospital_tokens = [
        token
        for token in all_tokens
        if token.center_x >= width * HOSPITAL_REGION_MIN_X
        and token.center_x <= width * HOSPITAL_REGION_MAX_X
        and token.center_y <= height * HOSPITAL_REGION_MAX_Y
    ]

    # 토큰들을 줄 단위 텍스트로 바꿈
    receipt_lines = _tokens_to_lines(receipt_tokens)
    guide_lines = _tokens_to_lines(guide_tokens)
    schedule_lines = _tokens_to_lines(schedule_tokens)
    hospital_lines = _tokens_to_lines(hospital_tokens)
    all_lines = _tokens_to_lines(all_tokens)

    # 약 목록 추출 (순서대로 시도)
    medicines = (
        _extract_medicines_from_instruction_text(all_lines)  # 복약 안내 문장형 텍스트에서 약 찾기
        or _extract_medicines_from_aligned_columns(all_tokens)  # 표의 컬럼 정렬 기준으로 약 찾기
        or _extract_medicines_from_table_headers(all_tokens)  # 약품명/투약량/횟수/일수 헤더 기준으로 찾기
        or _extract_receipt_medicines_from_headers(all_tokens)  # 영수증 헤더 기준으로 찾기
        or _extract_medicines_from_text_table(all_tokens)  # 일반 텍스트 테이블 방식으로 찾기
    )
    if not medicines:
        medicines = _extract_guide_medicines(guide_lines)

    
    schedule = _extract_schedule(receipt_lines, schedule_lines, guide_lines, all_lines)  # 복용 스케줄 추출
    _apply_schedule_defaults(medicines, schedule)  # 약마다 빠진 값 채워주기

    # 조제일자 추출
    dispensed_date = _extract_date_to_right_of_label(all_tokens) or _extract_date_from_tokens(all_tokens) or _extract_first_date(receipt_lines, guide_lines, hospital_lines, all_lines)
    # 약국명 추출
    pharmacy_name = _extract_text_to_right_of_label(all_tokens, PHARMACY_LABELS) or _extract_pharmacy_name_from_tokens(all_tokens) or _extract_pharmacy_name(receipt_lines, all_lines)
    # 병원명 추출
    hospital_name = _extract_hospital_name(hospital_lines, guide_lines, all_lines)

    # 최종결과 반환
    return {
        "dispensedDate": dispensed_date,
        "hospitalName": hospital_name,
        "pharmacyName": pharmacy_name,
        "medicines": medicines,
    }

# 영수증/표처럼 생긴 영역에서 약 정보를 뽑는 기본 함수
def _extract_receipt_medicines(tokens: list[OcrToken]) -> list[dict[str, str | None]]:
    if not tokens:
        return []

    width = max(token.x_max for token in tokens)
    height = max(token.y_max for token in tokens)
    text_lookup = {token.text: token for token in tokens}

    header_y = text_lookup.get("약품명").center_y if text_lookup.get("약품명") else height * 0.58
    dose_x = text_lookup.get("투약량").center_x if text_lookup.get("투약량") else width * 0.68
    count_x = text_lookup.get("횟수").center_x if text_lookup.get("횟수") else width * 0.82
    day_x = text_lookup.get("일수").center_x if text_lookup.get("일수") else width * 0.92

    content_tokens = [
        token
        for token in tokens
        if token.center_y >= max(header_y + 8, height * 0.66)
        and token.center_x <= day_x + 30
        and token.text not in {"약품명", "투약량", "횟수", "일수"}
    ]

    rows = _cluster_rows(content_tokens, y_tolerance=18)
    medicines: list[dict[str, str | None]] = []

    for row in rows:
        row.sort(key=lambda token: token.center_x)
        name_parts: list[str] = []
        dosage = None
        frequency = None
        days = None

        for token in row:
            text = token.text.strip()
            if not text:
                continue

            if token.center_x < dose_x - 20:
                name_parts.append(text)
            elif token.center_x < count_x - 12:
                dosage = dosage or _extract_small_number(text, 9)
            elif token.center_x < day_x - 8:
                frequency = frequency or _extract_small_number(text, 12)
            else:
                days = days or _extract_small_number(text, 31)

        name = " ".join(name_parts).strip()
        if not name or not _looks_like_medicine_name(name):
            continue

        medicines.append(
            {
                "name": name,
                "dosage": dosage,
                "frequency": frequency,
                "days": days,
            }
        )

    return medicines

# “약품명/투약량/횟수/일수” 헤더를 먼저 찾아서, 그 아래 표를 읽는 함수
def _extract_receipt_medicines_from_headers(tokens: list[OcrToken]) -> list[dict[str, str | None]]:
    if not tokens:
        return []

    width = max(token.x_max for token in tokens)
    name_header = _find_anchor_token(tokens, ["약품명", "약품"])
    dose_header = _find_anchor_token(tokens, ["투약량", "투약"])
    count_header = _find_anchor_token(tokens, ["횟수", "횟"])
    day_header = _find_anchor_token(tokens, ["일수", "일분"])

    if name_header is None:
        return _extract_receipt_medicines(tokens)

    header_y = name_header.center_y
    dose_x = dose_header.center_x if dose_header else width * 0.62
    count_x = count_header.center_x if count_header else width * 0.77
    day_x = day_header.center_x if day_header else width * 0.90
    table_left_x = max(name_header.x_min - 16, 0)
    table_right_x = day_header.x_max + 28 if day_header else width

    content_tokens = [
        token
        for token in tokens
        if token.center_y >= header_y + 8
        and token.center_x >= table_left_x
        and token.center_x <= table_right_x
        and not _contains_any_label(token.text, ["약품명", "투약량", "횟수", "일수"])
    ]

    rows = _cluster_rows(content_tokens, y_tolerance=18)
    medicines: list[dict[str, str | None]] = []

    for row in rows:
        row.sort(key=lambda token: token.center_x)
        name_parts: list[str] = []
        dosage = None
        frequency = None
        days = None

        for token in row:
            text = token.text.strip()
            if not text:
                continue

            if token.center_x < dose_x - 20:
                name_parts.append(text)
            elif token.center_x < count_x - 12:
                dosage = dosage or _extract_small_number(text, 9)
            elif token.center_x < day_x - 8:
                frequency = frequency or _extract_small_number(text, 12)
            else:
                days = days or _extract_small_number(text, 31)

        name = " ".join(name_parts).strip()
        if _contains_any_label(name, ["급여", "본인", "금액", "조제", "병원", "상호"]):
            continue
        if not _looks_like_medicine_name(name):
            continue

        medicines.append(
            {
                "name": name,
                "dosage": dosage,
                "frequency": frequency,
                "days": days,
            }
        )

    return medicines

# 표 기반 추출
def _extract_medicines_from_table_headers(tokens: list[OcrToken]) -> list[dict[str, str | None]]:
    name_header = _find_anchor_token(tokens, MEDICINE_HEADER_LABELS)
    if name_header is None:
        return []

    dose_header = _find_anchor_token(tokens, DOSAGE_HEADER_LABELS)
    count_header = _find_anchor_token(tokens, FREQUENCY_HEADER_LABELS)
    day_header = _find_anchor_token(tokens, DAYS_HEADER_LABELS)

    width = max(token.x_max for token in tokens)
    dose_x = dose_header.center_x if dose_header else width * 0.62
    count_x = count_header.center_x if count_header else width * 0.77
    day_x = day_header.center_x if day_header else width * 0.90
    header_bottom_y = max(
        header.y_max
        for header in [name_header, dose_header, count_header, day_header]
        if header is not None
    )

    table_tokens = [
        token
        for token in tokens
        if token.center_y >= header_bottom_y + 8
        and token.center_x >= max(name_header.x_min - 24, 0)
        and token.center_x <= min(day_x + 36, width)
        and not _contains_any_label(token.text, MEDICINE_HEADER_LABELS + DOSAGE_HEADER_LABELS + FREQUENCY_HEADER_LABELS + DAYS_HEADER_LABELS)
    ]

    rows = _cluster_rows(table_tokens, y_tolerance=18)
    medicines: list[dict[str, str | None]] = []

    for row in rows:
        row.sort(key=lambda token: token.center_x)
        name_parts: list[str] = []
        dosage = None
        frequency = None
        days = None

        for token in row:
            text = token.text.strip()
            if not text:
                continue

            if token.center_x < dose_x - 20:
                name_parts.append(text)
            elif token.center_x < count_x - 12:
                dosage = dosage or _extract_small_number(text, 9)
            elif token.center_x < day_x - 8:
                frequency = frequency or _extract_small_number(text, 12)
            else:
                days = days or _extract_small_number(text, 31)

        name = " ".join(name_parts).strip()
        if not name or _contains_any_label(name, ["상호", "조제", "급여", "금액", "병원"]):
            continue
        if not _looks_like_medicine_name(name):
            continue

        medicines.append(
            {
                "name": name,
                "dosage": dosage,
                "frequency": frequency,
                "days": days,
            }
        )

    return medicines


def _extract_medicines_from_text_table(tokens: list[OcrToken]) -> list[dict[str, str | None]]:
    return _extract_medicines_from_lower_text_table(tokens)

# 이미지 아래쪽/중간 이후에 있는 표에서 약 정보를 뽑으려는 함수
def _extract_medicines_from_lower_text_table(tokens: list[OcrToken]) -> list[dict[str, str | None]]:
    name_header = _find_anchor_token(tokens, MEDICINE_HEADER_LABELS)
    if name_header is None or not tokens:
        return []

    width = max(token.x_max for token in tokens)
    height = max(token.y_max for token in tokens)
    dose_header = _find_anchor_token(tokens, DOSAGE_HEADER_LABELS)
    count_header = _find_anchor_token(tokens, FREQUENCY_HEADER_LABELS)
    day_header = _find_anchor_token(tokens, DAYS_HEADER_LABELS)

    dose_x = dose_header.center_x if dose_header else width * 0.62
    count_x = count_header.center_x if count_header else width * 0.77
    day_x = day_header.center_x if day_header else width * 0.90
    header_bottom_y = max(
        header.y_max
        for header in [name_header, dose_header, count_header, day_header]
        if header is not None
    )

    table_tokens = [
        token
        for token in tokens
        if token.center_y >= max(header_bottom_y + 8, height * 0.45)
        and token.center_x >= max(name_header.x_min - 24, 0)
        and token.center_x <= min(day_x + 36, width)
        and not _contains_any_label(
            token.text,
            MEDICINE_HEADER_LABELS + DOSAGE_HEADER_LABELS + FREQUENCY_HEADER_LABELS + DAYS_HEADER_LABELS,
        )
    ]

    rows = _cluster_rows(table_tokens, y_tolerance=18)
    medicines: list[dict[str, str | None]] = []

    for row in rows:
        row.sort(key=lambda token: token.center_x)
        name_parts: list[str] = []
        dosage = None
        frequency = None
        days = None

        for token in row:
            text = token.text.strip()
            if not text:
                continue

            if token.center_x < dose_x - 20:
                name_parts.append(text)
            elif token.center_x < count_x - 12:
                dosage = dosage or _extract_small_number(text, 9)
            elif token.center_x < day_x - 8:
                frequency = frequency or _extract_small_number(text, 12)
            else:
                days = days or _extract_small_number(text, 31)

        name = " ".join(name_parts).strip()
        if not name or not _looks_like_medicine_name(name):
            continue

        medicines.append(
            {
                "name": name,
                "dosage": dosage,
                "frequency": frequency,
                "days": days,
            }
        )

    return medicines

# 행 단위로 통째로 읽는 게 아니라, 컬럼별로 먼저 나눈 다음 같은 y좌표 근처 숫자를 붙이는 방식
def _extract_medicines_from_aligned_columns(tokens: list[OcrToken]) -> list[dict[str, str | None]]:
    if not tokens:
        return []

    name_header = _find_anchor_token(tokens, MEDICINE_HEADER_LABELS)
    if name_header is None:
        return []

    width = max(token.x_max for token in tokens)
    dose_header = _find_anchor_token(tokens, DOSAGE_HEADER_LABELS)
    count_header = _find_anchor_token(tokens, FREQUENCY_HEADER_LABELS)
    day_header = _find_anchor_token(tokens, DAYS_HEADER_LABELS)

    dose_x = dose_header.center_x if dose_header else width * 0.62
    count_x = count_header.center_x if count_header else width * 0.77
    day_x = day_header.center_x if day_header else width * 0.90
    header_bottom_y = max(
        header.y_max
        for header in [name_header, dose_header, count_header, day_header]
        if header is not None
    )

    content_tokens = [
        token
        for token in tokens
        if token.center_y >= header_bottom_y + 6
        and not _contains_any_label(
            token.text,
            MEDICINE_HEADER_LABELS + DOSAGE_HEADER_LABELS + FREQUENCY_HEADER_LABELS + DAYS_HEADER_LABELS,
        )
    ]

    name_tokens = [token for token in content_tokens if token.center_x < dose_x - 20]
    dose_tokens = [token for token in content_tokens if dose_x - 20 <= token.center_x < count_x - 10]
    frequency_tokens = [token for token in content_tokens if count_x - 10 <= token.center_x < day_x - 8]
    day_tokens = [token for token in content_tokens if token.center_x >= day_x - 8]

    name_rows = _cluster_rows(name_tokens, y_tolerance=22)
    medicines: list[dict[str, str | None]] = []

    for row in name_rows:
        row.sort(key=lambda token: token.center_x)
        row_y = sum(token.center_y for token in row) / len(row)
        name = " ".join(token.text.strip() for token in row if token.text.strip()).strip()
        dosage = _pick_nearest_small_number(dose_tokens, row_y, 9)
        frequency = _pick_nearest_small_number(frequency_tokens, row_y, 12)
        days = _pick_nearest_small_number(day_tokens, row_y, 31)

        if not name or not _looks_like_medicine_name(name):
            continue

        medicines.append(
            {
                "name": name,
                "dosage": dosage,
                "frequency": frequency,
                "days": days,
            }
        )

    return medicines

# 문장형 복약 안내문에서 약 정보를 뽑는 함수
def _extract_medicines_from_instruction_text(lines: list[str]) -> list[dict[str, str | None]]:
    medicines: list[dict[str, str | None]] = []
    current_name: str | None = None

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        medicine_name = _extract_medicine_name_from_line(line)
        dosage_info = _extract_dosage_instruction(line)

        if medicine_name:
            current_name = medicine_name

            if dosage_info:
                medicines.append(
                    {
                        "name": medicine_name,
                        "dosage": dosage_info["dosage"],
                        "frequency": dosage_info["frequency"],
                        "days": dosage_info["days"],
                    }
                )
                current_name = None

            continue

        if current_name and dosage_info:
            medicines.append(
                {
                    "name": current_name,
                    "dosage": dosage_info["dosage"],
                    "frequency": dosage_info["frequency"],
                    "days": dosage_info["days"],
                }
            )
            current_name = None

    return medicines

# 최후 함수: 복약 안내 영역 텍스트에서 약 이름처럼 보이는 것만이라도 찾는 함수
def _extract_guide_medicines(lines: list[str]) -> list[dict[str, str | None]]:
    medicines: list[dict[str, str | None]] = []

    for line in lines:
        normalized = line.replace(" ", "")
        if not _looks_like_medicine_name(normalized):
            continue

        name_match = re.search(r"([가-힣A-Za-z0-9]+(?:정|캡슐|시럽|현탁|서방)[A-Za-z0-9가-힣]*)", normalized)
        if not name_match:
            continue

        name = name_match.group(1)
        if any(medicine["name"] == name for medicine in medicines):
            continue

        medicines.append(
            {
                "name": name,
                "dosage": _extract_pattern_value(normalized, r"(\d+)(?:정|캡슐|포|ml|mg)"),
                "frequency": _extract_pattern_value(normalized, r"(\d+)회"),
                "days": _extract_pattern_value(normalized, r"(\d+)일"),
            }
        )

    return medicines

# 전체 OCR 문장 안에서 공통 복용법을 찾는 함수
def _extract_schedule(*line_groups: list[str]) -> dict[str, str | None]:
    joined = "\n".join("\n".join(lines) for lines in line_groups if lines)

    daily = _extract_pattern_value(joined, r"1일\s*(\d+)\s*회")
    days = _extract_pattern_value(joined, r"(\d+)\s*일분")
    dose = _extract_pattern_value(joined, r"(\d+)\s*(?:정|캡슐|포)\s*(?:씩)?\s*\d+\s*회")
    if dose is None:
        dose = _extract_pattern_value(joined, r"(\d+)\s*(?:정|캡슐|포)")

    return {
        "dosage": dose,
        "frequency": daily,
        "days": days,
    }

# 약 정보에 빠진 복용값을 공통 스케줄로 채워주는 함수
def _apply_schedule_defaults(medicines: list[dict[str, str | None]], schedule: dict[str, str | None]) -> None:
    if not medicines:
        return

    for medicine in medicines:
        if medicine.get("dosage") is None:
            medicine["dosage"] = schedule.get("dosage")
        if medicine.get("frequency") is None:
            medicine["frequency"] = schedule.get("frequency")
        if medicine.get("days") is None:
            medicine["days"] = schedule.get("days")

# 특정 라벨 오른쪽에 있는 값을 뽑는 함수
def _extract_text_to_right_of_label(tokens: list[OcrToken], labels: list[str]) -> str | None:
    anchor = _find_anchor_token(tokens, labels)
    if anchor is None:
        return None

    right_tokens = [
        token
        for token in tokens
        if token.center_x > anchor.x_max
        and abs(token.center_y - anchor.center_y) <= 20
    ]
    if right_tokens:
        right_tokens.sort(key=lambda token: token.center_x)
        return _join_token_text(right_tokens)

    next_row_tokens = [
        token
        for token in tokens
        if token.center_y > anchor.center_y
        and token.center_y <= anchor.center_y + 40
        and token.center_x >= anchor.x_min
    ]
    if next_row_tokens:
        next_row_tokens.sort(key=lambda token: (token.center_y, token.center_x))
        return _join_token_text(next_row_tokens)

    return None

# 조제일자/처방일자/교부일자 오른쪽의 날짜를 찾는 함수
def _extract_date_to_right_of_label(tokens: list[OcrToken]) -> str | None:
    value = _extract_text_to_right_of_label(tokens, DISPENSED_DATE_LABELS)
    if not value:
        return None

    match = re.search(r"(20\d{2})[-./년 ]\s*(\d{1,2})[-./월 ]\s*(\d{1,2})", value)
    if not match:
        return None

    return f"{match.group(1)}-{int(match.group(2)):02d}-{int(match.group(3)):02d}"

# 전체 OCR 텍스트에서 날짜처럼 생긴 걸 찾는 함수
def _extract_date_from_tokens(tokens: list[OcrToken]) -> str | None:
    joined = "\n".join(_tokens_to_lines(tokens))
    match = re.search(r"(20\d{2})[-./년 ]\s*(\d{1,2})[-./월 ]\s*(\d{1,2})", joined)
    if not match:
        return None

    return f"{match.group(1)}-{int(match.group(2)):02d}-{int(match.group(3)):02d}"

# 최후: 줄 단위 텍스트에서 처음 발견되는 날짜를 가져오는 함수
def _extract_first_date(*line_groups: list[str]) -> str | None:
    for lines in line_groups:
        for line in lines:
            match = re.search(r"(20\d{2})[-./](\d{2})[-./](\d{2})", line)
            if match:
                return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
    return None

# 약국 이름을 줄 단위 텍스트에서 찾는 함수
def _extract_pharmacy_name(*line_groups: list[str]) -> str | None:
    for lines in line_groups:
        for index, line in enumerate(lines):
            compact = line.replace(" ", "")
            if "약국" in compact and "병원" not in compact:
                if compact in {"약국", "상호", "상호명", "약국명"} and index + 1 < len(lines):
                    return lines[index + 1].strip()

                cleaned = re.sub(r"^(상호명|상호|약국명)\s*[:：]?\s*", "", line).strip()
                return cleaned
    return None

# 좌표 기반으로 약국명을 찾는 함수
def _extract_pharmacy_name_from_tokens(tokens: list[OcrToken]) -> str | None:
    anchor = _find_anchor_token(tokens, ["상호", "상호명"])
    if anchor is None:
        return None

    same_row_tokens = [
        token
        for token in tokens
        if token.center_x > anchor.x_max
        and abs(token.center_y - anchor.center_y) <= 18
    ]
    if same_row_tokens:
        same_row_tokens.sort(key=lambda token: token.center_x)
        value = " ".join(token.text.strip() for token in same_row_tokens if token.text.strip()).strip()
        return value or None

    next_row_tokens = [
        token
        for token in tokens
        if token.center_y > anchor.center_y
        and token.center_y <= anchor.center_y + 40
        and token.center_x >= anchor.x_min
    ]
    if next_row_tokens:
        next_row_tokens.sort(key=lambda token: (token.center_y, token.center_x))
        value = " ".join(token.text.strip() for token in next_row_tokens if token.text.strip()).strip()
        return value or None

    return None

# 병원명 찾는 함수
def _extract_hospital_name(*line_groups: list[str]) -> str | None:
    for lines in line_groups:
        joined = "\n".join(lines)
        for suffix in HOSPITAL_SUFFIXES:
            match = re.search(rf"([가-힣A-Za-z0-9]+{suffix})", joined)
            if match:
                return match.group(1)
    return None

# 토큰 여러 개를 공백으로 이어붙이는 함수
def _join_token_text(tokens: list[OcrToken]) -> str | None:
    value = " ".join(token.text.strip() for token in tokens if token.text.strip()).strip()
    return value or None

# 특수문자 제거하고 소문자로 바꿈
def _normalize_anchor_text(text: str) -> str:
    return re.sub(r"[^0-9A-Za-z가-힣]", "", text).lower()

# 어떤 텍스트 안에 라벨 목록 중 하나가 들어있는지 확인
def _contains_any_label(text: str, labels: list[str]) -> bool:
    normalized = _normalize_anchor_text(text)
    return any(_normalize_anchor_text(label) in normalized for label in labels)

# 라벨 토큰을 찾는 함수
def _find_anchor_token(tokens: list[OcrToken], labels: list[str]) -> OcrToken | None:
    candidates = [token for token in tokens if _contains_any_label(token.text, labels)]
    if not candidates:
        return None

    candidates.sort(key=lambda token: (token.center_y, token.center_x))
    return candidates[0]

# OCR 토큰들을 줄 단위 문자열로 묶는 함수
def _tokens_to_lines(tokens: list[OcrToken], y_tolerance: float = 18) -> list[str]:
    if not tokens:
        return []

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

    lines: list[str] = []
    for row in rows:
        row.sort(key=lambda token: token.center_x)
        text = " ".join(token.text for token in row).strip()
        if text:
            lines.append(text)

    return lines

# 줄 묶기 함수인데, 반환이 문자열이 아니라 토큰 행 리스트
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

# 이 문자열이 약 이름처럼 보이는지 검사하는 함수
def _looks_like_medicine_name(text: str) -> bool:
    compact = text.replace(" ", "")
    if len(compact) < 3:
        return False

    if any(keyword in compact for keyword in NOISE_KEYWORDS):
        return False

    return any(hint in compact for hint in MEDICINE_NAME_HINTS)

# 약 이름 후보 판단 함수
def _looks_like_generic_table_medicine_name(text: str) -> bool:
    compact = text.replace(" ", "")
    if len(compact) < 2:
        return False

    if any(keyword in compact for keyword in NOISE_KEYWORDS):
        return False

    if re.search(r"(약품명|투약량|횟수|일수|복약안내|주의사항|영수증|환자정보|병원정보)", compact):
        return False

    return bool(re.search(r"[가-힣A-Za-z]", compact))

# 텍스트에서 숫자를 뽑되, 너무 큰 숫자는 제외
def _extract_small_number(text: str, max_value: int) -> str | None:
    for match in re.findall(r"\d+(?:\.\d+)?", text):
        value = float(match)
        if 0 < value <= max_value:
            return match
    return None

# 특정 약 이름 줄과 y좌표가 가장 가까운 숫자를 고르는 함수
def _pick_nearest_small_number(tokens: list[OcrToken], target_y: float, max_value: int) -> str | None:
    candidates: list[tuple[float, str]] = []

    for token in tokens:
        value = _extract_small_number(token.text, max_value)
        if value is None:
            continue

        distance = abs(token.center_y - target_y)
        if distance <= 28:
            candidates.append((distance, value))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0])
    return candidates[0][1]

# 문장 한 줄에서 약 이름만 뽑는 함수
def _extract_medicine_name_from_line(text: str) -> str | None:
    compact = text.replace(" ", "")
    match = re.search(r"([가-힣A-Za-z0-9]+(?:정|캡슐|서방정|산|시럽)\d*(?:mg|ml)?)", compact)
    if not match:
        match = re.search(r"([가-힣A-Za-z0-9]+(?:정|캡슐|서방정|산|시럽))", compact)

    if not match:
        return None

    candidate = match.group(1).strip()
    return candidate if _looks_like_medicine_name(candidate) else None

# 복용법 문장에서 dosage/frequency/days를 한 번에 뽑는 함수
def _extract_dosage_instruction(text: str) -> dict[str, str] | None:
    compact = text.replace(" ", "")
    match = re.search(r"(\d+)(정|캡슐|포|ml)(?:씩)?(\d+)회(\d+)일분", compact)
    if not match:
        return None

    return {
        "dosage": match.group(1),
        "frequency": match.group(3),
        "days": match.group(4),
    }

# 정규식으로 첫 번째 그룹만 뽑아주는 공용 함수
def _extract_pattern_value(text: str, pattern: str) -> str | None:
    match = re.search(pattern, text)
    return match.group(1) if match else None

# 이미지를 프론트에서 바로 보여줄 수 있는 base64 문자열로 바꾸는 함수
def _to_png_data_url(image_array: np.ndarray) -> str:
    encoded = base64.b64encode(_to_png_bytes(image_array)).decode("ascii")
    return f"data:image/png;base64,{encoded}"

# numpy 이미지 배열을 PNG 바이트로 바꾸는 함수
def _to_png_bytes(image_array: np.ndarray) -> bytes:
    image = Image.fromarray(image_array.astype(np.uint8))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()

# Google Vision OCR 클라이언트를 만드는 함수
def _get_ocr_client() -> vision.ImageAnnotatorClient:
    global _ocr_client

    if _ocr_client is None:
        try:
            if settings.google_application_credentials_json:
                credentials_info = json.loads(settings.google_application_credentials_json)
                credentials = service_account.Credentials.from_service_account_info(credentials_info)
                _ocr_client = vision.ImageAnnotatorClient(credentials=credentials)
            else:
                if settings.google_application_credentials:
                    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.google_application_credentials
                _ocr_client = vision.ImageAnnotatorClient()
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Failed to initialize Google Vision client. Configure "
                    "GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_APPLICATION_CREDENTIALS_JSON, "
                    "or local Application Default Credentials via "
                    "`gcloud auth application-default login`. "
                    f"Original error: {exc}"
                ),
            ) from exc

    return _ocr_client

# AWS S3 클라이언트를 만드는 함수
def _get_s3_client():
    global _s3_client

    if not settings.aws_s3_bucket:
        raise HTTPException(status_code=500, detail="AWS_S3_BUCKET is not configured.")

    if _s3_client is None:
        client_kwargs: dict[str, Any] = {
            "service_name": "s3",
            "region_name": settings.aws_region,
            "config": Config(signature_version="s3v4"),
        }

        if settings.aws_access_key_id and settings.aws_secret_access_key:
            client_kwargs["aws_access_key_id"] = settings.aws_access_key_id
            client_kwargs["aws_secret_access_key"] = settings.aws_secret_access_key

        if settings.aws_s3_endpoint:
            client_kwargs["endpoint_url"] = settings.aws_s3_endpoint

        _s3_client = boto3.client(**client_kwargs)

    return _s3_client
