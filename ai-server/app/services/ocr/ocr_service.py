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
from google.auth import load_credentials_from_dict
from google.cloud import vision
from PIL import Image

from app.core.config import settings
from app.schemas.ocr import AiOcrRequest, AiOcrResponse
from app.services.ocr.image_preprocessing import preprocess_prescription_image


OCR_ENGINE_NAME = "google-vision-document-text-detection"
MEDICINE_HEADER_LABELS = ["약품명", "약명", "품명"]
DOSAGE_HEADER_LABELS = ["투약량", "투약", "용량"]
FREQUENCY_HEADER_LABELS = ["횟수", "회수", "회"]
DAYS_HEADER_LABELS = ["일수", "일분"]
GUIDE_HEADER_LABELS = ["복약안내"]
CAUTION_HEADER_LABELS = ["주의사항"]
PHARMACY_LABELS = ["약국명", "약국", "상호", "상호명"]
DATE_LABELS = ["조제일자", "처방일자", "교부일자"]
HOSPITAL_SUFFIXES = ("병원", "의원", "내과", "외과", "이비인후과", "치과", "한의원")
MEDICINE_NAME_HINTS = ("정", "캡슐", "캅셀", "시럽", "현탁액", "과립", "겔", "크림", "주사", "mg", "ml", "mL")
NAME_NOISE_KEYWORDS = ("영수증","계산서","약제비","금액","본인부담","보험자","급여","비급여","현금","카드","교부번호",
    "성명","조제약사","사업장","소재지","발행일","서비스","환자정보","병원정보","복약안내","주의사항","약품사진","식후",
    "식전","공복","아침","점심","저녁","취침전","보관","밀폐용기","기밀용기","차광보관","원형정제","장방형","필름코팅정",
    "분말","결정성","항생제","진통제","소염","항염","면역","작용","치료","개선","위장","증상","설사","금주","전문가","복용",)
BREAK_MARKERS = ("아침", "점심", "저녁", "취침전", "식후", "식전", "공복", "표시대로", "baropharm.com")

_ocr_client: vision.ImageAnnotatorClient | None = None
_s3_client: Any | None = None

# OCR로 읽은 단어 1개의 정보를 담는 자료구조 (텍스트, 좌표)
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

# 메인
def analyze_prescription(request: AiOcrRequest) -> AiOcrResponse:
    image_array = _load_image_from_s3(request.imageKey)  # S3에서 이미지 불러오기
    preprocessed_image = preprocess_prescription_image(image_array)  # 이미지 전처리
    preview_data_url = _to_png_data_url(preprocessed_image)  # 이미지 배열을 브라우저 미리보기용 PNG data URL 문자열로 변환

    all_tokens = _extract_tokens(preprocessed_image) # OCR 호출해서 텍스트를 토큰 단위로 추출
    structured_result = _build_structured_result(preprocessed_image.shape, all_tokens)  # OCR로 읽은 전체 토큰을 최종 구조화 결과로 변환
    raw_text = "\n".join(_tokens_to_lines(all_tokens))

    print(
        f"OCR raw text extracted | ocrResultId={request.ocrResultId} "
        f"userId={request.userId} imageKey={request.imageKey}\n{raw_text}",
        flush=True,
    )

    result_json = json.dumps(
        {
            "ocrResultId": request.ocrResultId,
            "userId": request.userId,
            "imageKey": request.imageKey,
            **structured_result,
        },
        ensure_ascii=False,
    )

    return AiOcrResponse(
        rawText=raw_text,
        resultJson=result_json,
        ocrEngine=OCR_ENGINE_NAME,
        preprocessedImageDataUrl=preview_data_url,
    )

# S3에 저장된 이미지를 가져와서 OCR용 배열로 변환
def _load_image_from_s3(image_key: str) -> np.ndarray:
    client = _get_s3_client()

    try:
        response = client.get_object(Bucket=settings.aws_s3_bucket, Key=image_key)
        image_bytes = response["Body"].read()
    except (ClientError, BotoCoreError) as exc:
        raise HTTPException(status_code=502, detail=f"Failed to load image from S3: {exc}") from exc

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Uploaded image could not be decoded.") from exc

    return np.array(image)

# OCR 호출해서 텍스트를 토큰 단위로 추출
def _extract_tokens(image_array: np.ndarray) -> list[OcrToken]:
    client = _get_ocr_client()
    image = vision.Image(content=_to_png_bytes(image_array))
    image_context = vision.ImageContext(language_hints=["ko", "en"])

    try:
        response = client.document_text_detection(image=image, image_context=image_context)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OCR extraction failed: {exc}") from exc

    if response.error.message:
        raise HTTPException(status_code=502, detail=f"OCR extraction failed: {response.error.message}")

    tokens: list[OcrToken] = []
    annotation = response.full_text_annotation
    if not annotation:
        return tokens

    for page in annotation.pages:
        for block in page.blocks:
            for paragraph in block.paragraphs:
                for word in paragraph.words:
                    text = "".join(symbol.text for symbol in word.symbols).strip()
                    if not text:
                        continue

                    vertices = word.bounding_box.vertices
                    if not vertices:
                        continue

                    xs = [vertex.x or 0 for vertex in vertices]
                    ys = [vertex.y or 0 for vertex in vertices]
                    tokens.append(
                        OcrToken(
                            text=text,
                            x_min=min(xs),
                            y_min=min(ys),
                            x_max=max(xs),
                            y_max=max(ys),
                        )
                    )

    return tokens

# OCR로 읽은 전체 토큰을 최종 구조화 결과로 변환
def _build_structured_result(image_shape: tuple[int, ...], all_tokens: list[OcrToken]) -> dict[str, Any]:
    _ = image_shape
    all_lines = _tokens_to_lines(all_tokens)

    guide_line_medicines = _extract_medicines_from_guide_lines(all_lines)
    summary_line_medicines = _extract_medicines_from_summary_lines(all_lines)
    aligned_medicines = _extract_medicines_from_aligned_columns(all_tokens)

    candidates = {
        "guide_lines": guide_line_medicines,
        "summary_lines": summary_line_medicines,
        "aligned": aligned_medicines,
    }
    selected_source, medicines = max(
        candidates.items(),
        key=lambda item: _score_medicine_candidates(item[1]),
    )

    schedule = _extract_schedule_strict(all_lines)
    _apply_schedule_defaults(medicines, schedule)
    medicines = _finalize_medicines(medicines)

    print(
        "OCR extractor debug | "
        f"guide_lines={guide_line_medicines} | "
        f"summary_lines={summary_line_medicines} | "
        f"aligned={aligned_medicines} | "
        f"schedule={schedule} | "
        f"selected_source={selected_source} | "
        f"selected={medicines}",
        flush=True,
    )

    dispensed_date = _extract_dispensed_date(all_tokens, all_lines)
    pharmacy_name = _extract_pharmacy_name(all_tokens, all_lines)
    hospital_name = _extract_hospital_name(all_lines)

    return {
        "dispensedDate": dispensed_date,
        "hospitalName": hospital_name,
        "pharmacyName": pharmacy_name,
        "medicines": medicines,
    }

# 큰표에서 약 정보 읽기
def _extract_medicines_from_guide_lines(lines: list[str]) -> list[dict[str, str | None]]:
    medicines: list[dict[str, str | None]] = []

    for line in lines:
        stripped = line.strip()
        if "[" not in stripped:
            continue

        name = _extract_name_before_bracket(stripped)
        if name is None:
            continue

        dosage = _extract_dosage_from_bracket_line(stripped)
        frequency = _extract_pattern_value(stripped, r"(\d+)\s*회")
        days = _extract_pattern_value(stripped, r"(\d+)\s*일분")
        _append_medicine(medicines, name, dosage, frequency, days)

    return medicines

# 작은표에서 약 정보 읽기 (줄 텍스트 기반 - 같은 y축끼리 묶어서 한줄로 )
def _extract_medicines_from_summary_lines(lines: list[str]) -> list[dict[str, str | None]]:
    medicines: list[dict[str, str | None]] = []
    header_indexes = [
        index
        for index, line in enumerate(lines)
        if _contains_all_labels(line, DOSAGE_HEADER_LABELS)
        and _contains_all_labels(line, FREQUENCY_HEADER_LABELS)
        and _contains_all_labels(line, DAYS_HEADER_LABELS)
        and (
            _contains_all_labels(line, MEDICINE_HEADER_LABELS)
            or index == 0
            or index > 0 and _contains_any_label(lines[index - 1], MEDICINE_HEADER_LABELS)
            or index + 1 < len(lines) and _contains_any_label(lines[index + 1], MEDICINE_HEADER_LABELS)
            or _has_medicine_like_summary_lines(lines, index + 1, index + 6)
        )
    ]
    if not header_indexes:
        return medicines

    header_index = header_indexes[-1]
    block: list[str] = []
    for line in lines[header_index + 1 : header_index + 12]:
        stripped = line.strip()
        compact = stripped.replace(" ", "")
        if not stripped:
            continue
        if any(marker in compact for marker in BREAK_MARKERS):
            break
        if compact.startswith(("※", "*", "•", "-", "baropharm.com")):
            continue
        block.append(stripped)

    pending_counts: tuple[str | None, str | None, str | None] | None = None
    for index, line in enumerate(block):
        if _is_summary_count_only_line(line):
            pending_counts = _extract_counts_from_count_line(line)
            continue

        name = _extract_name_from_summary_line(line)
        if name is None:
            continue

        dosage, frequency, days = _extract_summary_counts(line)
        if pending_counts is not None:
            dosage = dosage or pending_counts[0]
            frequency = frequency or pending_counts[1]
            days = days or pending_counts[2]
            pending_counts = None

        if index + 1 < len(block) and _is_summary_count_only_line(block[index + 1]):
            next_counts = _extract_counts_from_count_line(block[index + 1])
            dosage = dosage or next_counts[0]
            frequency = frequency or next_counts[1]
            days = days or next_counts[2]

        _append_medicine(medicines, name, dosage, frequency, days)

    return medicines


# 작은표의 열 정렬을 기준으로 약 정보 (좌표 정렬 기반 - 단어 조각들의 좌표를 직접 보는 방식)
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
        name = _clean_medicine_name(" ".join(token.text.strip() for token in row if token.text.strip()))
        dosage = _pick_nearest_small_number(dose_tokens, row_y, 9)
        frequency = _pick_nearest_small_number(frequency_tokens, row_y, 12)
        days = _pick_nearest_small_number(day_tokens, row_y, 31)
        _append_medicine(medicines, name, dosage, frequency, days)

    return medicines

# 스케쥴 정보칸에서 투약량/횟수/일수 읽기 (공통 복약 규칙)
def _extract_schedule_strict(lines: list[str]) -> dict[str, str | None]:
    dosage = None
    frequency = None
    days = None

    compact_lines = [line.replace(" ", "") for line in lines if line.strip()]
    windows: list[str] = []
    for index in range(len(compact_lines)):
        windows.append(compact_lines[index])
        if index + 1 < len(compact_lines):
            windows.append(compact_lines[index] + compact_lines[index + 1])
        if index + 2 < len(compact_lines):
            windows.append(compact_lines[index] + compact_lines[index + 1] + compact_lines[index + 2])

    for compact in reversed(windows):
        if frequency is None:
            match = re.search(r"1일(\d+)회", compact)
            if not match:
                match = re.search(r"(\d+)회.*1일", compact)
            if match:
                frequency = match.group(1)
        if days is None:
            match = re.search(r"투약일수(\d+)", compact)
            if not match:
                match = re.search(r"(\d+)일분", compact)
            if match:
                days = match.group(1)
        if dosage is None:
            match = re.search(r"1(?:정|캡슐|포|봉|스푼)", compact)
            if match:
                dosage = "1"

        if dosage is not None and frequency is not None and days is not None:
            break

    return {
        "dosage": dosage,
        "frequency": frequency,
        "days": days,
    }

# 공통 복약 규칙을 각 약 정보 칸에 채워넣기
def _apply_schedule_defaults(medicines: list[dict[str, str | None]], schedule: dict[str, str | None]) -> None:
    for medicine in medicines:
        if medicine.get("dosage") is None:
            medicine["dosage"] = schedule.get("dosage")
        if medicine.get("frequency") is None:
            medicine["frequency"] = schedule.get("frequency")
        if medicine.get("days") is None:
            medicine["days"] = schedule.get("days")
        if (
            medicine.get("frequency") == "1"
            and medicine.get("days")
            and schedule.get("frequency")
            and schedule.get("days")
        ):
            try:
                if int(medicine["days"]) > int(schedule["days"]):
                    medicine["frequency"] = schedule["frequency"]
                    medicine["days"] = schedule["days"]
            except ValueError:
                pass

# 최종 약 리스트 정리
def _finalize_medicines(medicines: list[dict[str, str | None]]) -> list[dict[str, str | None]]:
    finalized: list[dict[str, str | None]] = []
    seen: set[str] = set()

    for medicine in medicines:
        name = _finalize_name(medicine.get("name"))
        if name is None or name in seen:
            continue

        finalized.append(
            {
                "name": name,
                "dosage": medicine.get("dosage"),
                "frequency": medicine.get("frequency"),
                "days": medicine.get("days"),
            }
        )
        seen.add(name)

    return finalized

# =====================================================================================

# 제조일자
def _extract_dispensed_date(tokens: list[OcrToken], lines: list[str]) -> str | None:
    value = _extract_text_to_right_of_label(tokens, DATE_LABELS)
    normalized = _normalize_date(value) if value else None
    if normalized:
        return normalized

    for line in lines:
        normalized = _normalize_date(line)
        if normalized:
            return normalized
    return None

# 약국명
def _extract_pharmacy_name(tokens: list[OcrToken], lines: list[str]) -> str | None:
    value = _extract_text_to_right_of_label(tokens, PHARMACY_LABELS)
    cleaned = _sanitize_metadata_value(value)
    if cleaned and "약국" in cleaned:
        return _trim_to_pharmacy_name(cleaned)

    for line in lines:
        compact = line.replace(" ", "")
        if "약국" not in compact:
            continue
        if any(keyword in compact for keyword in ("사업장", "병원", "환자", "상성", "성명")):
            continue
        trimmed = _trim_to_pharmacy_name(line.replace(" ", "").strip())
        if trimmed:
            return trimmed

    return None

# 병원명
def _extract_hospital_name(lines: list[str]) -> str | None:
    for index, line in enumerate(lines):
        compact = line.replace(" ", "")
        if any(keyword in compact for keyword in ("병원정보", "발행기관")):
            joined = compact + "".join(item.replace(" ", "") for item in lines[index + 1 : index + 3])
            trimmed = _extract_hospital_name_after_label(joined)
            if trimmed:
                return trimmed

    for line in lines:
        compact = line.replace(" ", "")
        trimmed = _extract_line_ending_with_suffix(compact)
        if trimmed:
            return trimmed
    return None

# 라벨 오른쪽에 붙은 값 읽기
def _extract_text_to_right_of_label(tokens: list[OcrToken], labels: list[str]) -> str | None:
    anchor = _find_anchor_token(tokens, labels)
    if anchor is None:
        return None

    same_row_tokens = [
        token
        for token in tokens
        if token.center_x > anchor.x_max and abs(token.center_y - anchor.center_y) <= 20
    ]
    if same_row_tokens:
        same_row_tokens.sort(key=lambda token: token.center_x)
        return _join_token_text(same_row_tokens)

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

# =====================================보조 함수================================================

# 날짜 문자열 정규화
def _normalize_date(text: str | None) -> str | None:
    if not text:
        return None

    match = re.search(r"(20\d{2})[-./년 ]\s*(\d{1,2})[-./월 ]\s*(\d{1,2})", text)
    if not match:
        return None

    return f"{match.group(1)}-{int(match.group(2)):02d}-{int(match.group(3)):02d}"

# 약 리스트에 추가/병합
def _append_medicine(
    medicines: list[dict[str, str | None]],
    name: str | None,
    dosage: str | None,
    frequency: str | None,
    days: str | None,
) -> None:
    cleaned_name = _finalize_name(name)
    if cleaned_name is None:
        return

    existing = next((medicine for medicine in medicines if medicine["name"] == cleaned_name), None)
    if existing is None:
        medicines.append(
            {
                "name": cleaned_name,
                "dosage": dosage,
                "frequency": frequency,
                "days": days,
            }
        )
        return

    if existing.get("dosage") is None and dosage is not None:
        existing["dosage"] = dosage
    if existing.get("frequency") is None and frequency is not None:
        existing["frequency"] = frequency
    if existing.get("days") is None and days is not None:
        existing["days"] = days

# [ ] 대괄호 제거
def _extract_name_before_bracket(line: str) -> str | None:
    prefix = line.split("[", 1)[0]
    prefix = re.sub(r"^(?:금계|현금계|합계|합|원|카드|현금)\s*\d[\d,]*\s*", "", prefix).strip()
    return _finalize_name(prefix)

# 대괄호가 있는 한 줄에서 1회 복용량만 뽑는 함수
def _extract_dosage_from_bracket_line(line: str) -> str | None:
    compact = line.replace(" ", "")
    match = re.search(r"/(\d+)(?:정|캡슐|포|봉)", compact)
    if match:
        return match.group(1)

    match = re.search(r"(\d+)(?:정|캡슐|포|봉)씩", compact)
    if match:
        return match.group(1)

    return None

# 작은표 한줄에서 약이름 부분만 제거
def _extract_name_from_summary_line(line: str) -> str | None:
    name = line
    name = re.sub(r"^[▶•*xX]+\s*", "", name)
    name = re.sub(r"(먹는\s*약.*)$", "", name)
    name = re.sub(r"\[[^\]]*\]", "", name)
    name = re.sub(r"(?:\d+\s*\.\.\.\s*\d+|\d+\s+\d+\s+\d+|\d+\s+\d+|\d+\.\d+\d*)$", "", name).strip()
    return _finalize_name(name)

# 작은표 한줄에서 dosage / frequency / days를 추출
def _extract_summary_counts(line: str) -> tuple[str | None, str | None, str | None]:
    dosage = _extract_dosage_from_bracket_line(line)
    frequency = None
    days = None

    tail = _extract_summary_tail(line)
    decoded = _decode_compact_count_blob(tail)
    if decoded:
        if dosage is None and len(decoded) > 0:
            dosage = decoded[0]
        if len(decoded) > 1:
            frequency = decoded[-2] if dosage is not None and len(decoded) >= 2 else decoded[1]
        if len(decoded) > 2:
            days = decoded[-1]
        elif len(decoded) == 2 and dosage is None:
            days = decoded[1] if len(decoded[1]) > 1 else None

    return dosage, frequency, days

# 이 줄이 약이름없이 숫자정보만 있는 줄인지 판별
def _is_summary_count_only_line(line: str) -> bool:
    compact = line.replace(" ", "")
    if not compact:
        return False
    if _finalize_name(line) is not None:
        return False
    if any(hint in compact for hint in MEDICINE_NAME_HINTS):
        return False
    return bool(re.search(r"\d", compact))

# 숫자만 있는 줄에서 dosage / frequency / days를 분리
def _extract_counts_from_count_line(line: str) -> tuple[str | None, str | None, str | None]:
    compact = line.replace(" ", "")
    if match := re.search(r"1일(\d+)회(\d+)일분", compact):
        return None, match.group(1), match.group(2)
    if match := re.search(r"(\d+)회(\d+)일분", compact):
        return None, match.group(1), match.group(2)
    if match := re.search(r"투약일수(\d+)", compact):
        return None, None, match.group(1)

    decoded = _decode_compact_count_blob(compact)
    dosage = decoded[0] if len(decoded) > 0 else None
    frequency = decoded[1] if len(decoded) > 1 else None
    days = decoded[2] if len(decoded) > 2 else None
    return dosage, frequency, days

# 붙은 숫자들을 dosage / frequency / days 후보로 (114, 127)
def _decode_compact_count_blob(text: str) -> list[str]:
    compact = re.sub(r"[^0-9.]", "", text)
    if not compact:
        return []
    if match := re.fullmatch(r"0\.(\d)(\d)(\d{2})", compact):
        return [f"0.{match.group(1)}", match.group(2), match.group(3)]
    if match := re.fullmatch(r"0\.(\d)(\d)(\d)", compact):
        return [f"0.{match.group(1)}", match.group(2), match.group(3)]
    if match := re.fullmatch(r"(\d)(\d)(\d)(\d)", compact):
        tail = match.group(3) + match.group(4)
        if 10 <= int(tail) <= 31:
            return [match.group(1), match.group(2), tail]
        return [match.group(1), match.group(2), match.group(3), match.group(4)]
    if match := re.fullmatch(r"(\d)(\d)(\d)", compact):
        if match.group(1) == match.group(2) and 10 <= int(match.group(2) + match.group(3)) <= 31:
            return [match.group(1), match.group(2), match.group(2) + match.group(3)]
        return [match.group(1), match.group(2), match.group(3)]
    if match := re.fullmatch(r"(\d)(\d{2})", compact):
        if 10 <= int(match.group(2)) <= 31:
            return [match.group(1), match.group(1), match.group(2)]
        return [match.group(1), match.group(2)]
    return re.findall(r"\d+(?:\.\d+)?", compact)

# 요약표 한 줄에서 약 이름 뒤에 붙은 숫자 꼬리 부분만 떼어내는 함수
def _extract_summary_tail(line: str) -> str:
    cleaned = re.sub(r"^[▶•*xX]+\s*", "", line).strip()
    if "]" in cleaned:
        return cleaned.split("]", 1)[1]

    strength_matches = list(re.finditer(r"\d+(?:\.\d+)?m[g]?\b", cleaned, flags=re.IGNORECASE))
    if strength_matches:
        return cleaned[strength_matches[-1].end() :]

    match = re.search(r"(?:정|캡슐|시럽|겔|산|과립|밀리그램|mg|ml|mL)(.*)$", cleaned)
    if match:
        return match.group(1)

    return cleaned

# 날짜/병원명/약국명 같은 메타데이터 문자열에서 불필요한 기호와 잡문자를 정리
def _sanitize_metadata_value(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip()
    compact = cleaned.replace(" ", "")
    if len(compact) > 24:
        return None
    if any(keyword in compact for keyword in NAME_NOISE_KEYWORDS):
        return None
    return cleaned

# 약국명 후보 문자열을 ~약국까지만 잘라서 약국명처럼 보이게 정리하는 함수
def _trim_to_pharmacy_name(text: str | None) -> str | None:
    if not text:
        return None
    compact = text.replace(" ", "")
    compact = re.sub(r"^(?:상호|호|현금계|금계|합계|\d+원)+", "", compact)
    match = re.search(r"([가-힣A-Za-z][가-힣A-Za-z0-9]*약국(?:서비스)?)", compact)
    if match:
        return re.sub(r"^원+", "", match.group(1))
    return None

# 붙여쓴 긴 문자열에서 병원, 의원, 약국 같은 접미사로 끝나는 이름 줄을 찾아내는 함수
def _extract_line_ending_with_suffix(compact: str) -> str | None:
    for suffix in HOSPITAL_SUFFIXES:
        match = re.search(rf"([가-힣A-Za-z0-9]+{suffix})", compact)
        if match:
            candidate = re.sub(r"^\d+(?:,\d+)?원?", "", match.group(1))
            if re.search(r"\d{{2,}}", candidate):
                continue
            if candidate in {"병원", "의원"}:
                continue
            return candidate
    return None

# 병원정보, 발행기관 같은 라벨 뒤쪽에서 병원명 후보를 뽑는 함수
def _extract_hospital_name_after_label(compact: str) -> str | None:
    compact = re.sub(r".*?(?:병원정보|발행기관)[:：]?", "", compact)
    return _extract_line_ending_with_suffix(compact)

# 특정 줄 구간 안에 요약표처럼 보이는 약 이름 줄이 실제로 있는지 확인하는 함수
def _has_medicine_like_summary_lines(lines: list[str], start: int, end: int) -> bool:
    for line in lines[start:end]:
        if _extract_name_from_summary_line(line) is not None:
            return True
    return False

# 추출된 약 목록이 얼마나 그럴듯한지 점수로 계산해서 최종 후보 선택에 쓰는 함수
def _score_medicine_candidates(medicines: list[dict[str, str | None]]) -> int:
    score = 0
    for medicine in medicines:
        name = medicine.get("name") or ""
        score += 3 if _looks_like_medicine_name(name) else -5
        score += 1 if medicine.get("dosage") else 0
        score += 1 if medicine.get("frequency") else 0
        score += 1 if medicine.get("days") else 0
    return score

# 약 이름 후보를 마지막으로 정리해서 공백, 특수문자, 이상한 꼬리를 제거
def _finalize_name(name: str | None) -> str | None:
    if not name:
        return None

    cleaned = _clean_medicine_name(name)
    cleaned = cleaned.replace(" ", "")
    cleaned = re.sub(r"\[(.*?)$", "", cleaned)
    cleaned = re.sub(r"(약효>|효능>).*", "", cleaned)
    cleaned = re.sub(r"(?:정|캡슐|시럽|겔|산|과립)(?:\d+)$", lambda m: m.group(0).rstrip("0123456789"), cleaned)
    cleaned = re.sub(r"(mg|ml|mL)\d+$", r"\1", cleaned)
    cleaned = re.sub(r"(\d+)m$", r"\1mg", cleaned)
    cleaned = re.sub(r"(?<!mg)(?<!ml)(?<!mL)\d{1,2}$", "", cleaned)
    cleaned = re.sub(r"^[▶•*xX]+", "", cleaned)
    cleaned = cleaned.strip("·-:,.")
    if len(cleaned) > 20 and any(keyword in cleaned for keyword in ("면역", "항염", "작용", "증상", "치료", "보관", "개선")):
        return None
    if any(color in cleaned for color in ("흰색", "백색", "황색", "분홍색", "초록", "연녹색")) and (
        "정제" in cleaned or "캡슐" in cleaned
    ):
        return None

    if not _looks_like_medicine_name(cleaned):
        return None
    return cleaned

# 약 이름 문자열을 더 기본적인 수준에서 정리
def _clean_medicine_name(text: str) -> str:
    value = re.sub(r"\[[^\]]*\]", " ", text)
    value = re.sub(r"\([^)]*\)", " ", value)
    value = re.sub(r"^[▶•*xX]+\s*", "", value)
    value = re.sub(r"\s+", " ", value).strip(" :-")
    return value

# 어떤 문자열이 실제 약 이름처럼 보이는지 규칙 기반으로 판별
def _looks_like_medicine_name(text: str) -> bool:
    compact = text.replace(" ", "")
    if len(compact) < 2:
        return False
    if any(keyword in compact for keyword in NAME_NOISE_KEYWORDS):
        return False
    return any(hint in compact for hint in MEDICINE_NAME_HINTS)

# 문자열 안에 특정 라벨 목록이 전부 들어 있는지 확인
def _contains_all_labels(text: str, labels: list[str]) -> bool:
    normalized = _normalize_anchor_text(text)
    return any(_normalize_anchor_text(label) in normalized for label in labels)

# 문자열 안에 특정 라벨 목록 중 하나라도 들어 있는지 확인
def _contains_any_label(text: str, labels: list[str]) -> bool:
    normalized = _normalize_anchor_text(text)
    return any(_normalize_anchor_text(label) in normalized for label in labels)

# OCR 토큰들 중에서 특정 기준 글자(anchor)에 해당하는 토큰을 찾아주는 함수
def _find_anchor_token(tokens: list[OcrToken], labels: list[str]) -> OcrToken | None:
    candidates = [token for token in tokens if _contains_any_label(token.text, labels)]
    if not candidates:
        return None
    candidates.sort(key=lambda token: (token.center_y, token.center_x))
    return candidates[0]

# anchor 탐색 전에 텍스트를 비교하기 쉽게 정규화
def _normalize_anchor_text(text: str) -> str:
    return re.sub(r"[^0-9A-Za-z가-힣]", "", text).lower()

# 여러 OCR 토큰의 텍스트를 하나의 문자열로 이어붙이는 함수
def _join_token_text(tokens: list[OcrToken]) -> str | None:
    value = " ".join(token.text.strip() for token in tokens if token.text.strip()).strip()
    return value or None

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

# OCR 토큰들을 같은 행(row)끼리 묶어주는 좌표 기반 유틸 함수
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

# 정규식 패턴으로 문자열에서 원하는 값 하나를 뽑아내는 공용 함수
def _extract_pattern_value(text: str, pattern: str) -> str | None:
    match = re.search(pattern, text.replace(" ", ""))
    return match.group(1) if match else None

# 문자열 안에서 너무 크지 않은 숫자만 안전하게 뽑는 함수
def _extract_small_number(text: str, max_value: int) -> str | None:
    for match in re.findall(r"\d+(?:\.\d+)?", text):
        value = float(match)
        if 0 < value <= max_value:
            return match
    return None

# 특정 y위치 근처 토큰들 중 가장 가까운 작은 숫자를 골라내는 함수
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

# 이미지 배열을 브라우저 미리보기용 PNG data URL 문자열로 바꾸는 함수
def _to_png_data_url(image_array: np.ndarray) -> str:
    encoded = base64.b64encode(_to_png_bytes(image_array)).decode("ascii")
    return f"data:image/png;base64,{encoded}"

# 이미지 배열을 PNG 바이트 데이터로 변환하는 함수
def _to_png_bytes(image_array: np.ndarray) -> bytes:
    image = Image.fromarray(image_array.astype(np.uint8))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _get_ocr_client() -> vision.ImageAnnotatorClient:
    global _ocr_client

    if _ocr_client is None:
        try:
            if settings.google_application_credentials_json:
                credentials_info = json.loads(settings.google_application_credentials_json)
                credentials, _ = load_credentials_from_dict(
                    credentials_info,
                    scopes=["https://www.googleapis.com/auth/cloud-platform"],
                )
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
