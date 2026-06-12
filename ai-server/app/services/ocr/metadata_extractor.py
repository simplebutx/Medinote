# 약 목록/복용 정보 추출 관련
import re

from app.services.ocr.ocr_clients import OcrToken

PHARMACY_LABELS = ["약국명", "약국", "상호", "상호명"]
DATE_LABELS = ["조제일자", "처방일자", "교부일자"]
HOSPITAL_SUFFIXES = ("병원", "의원", "내과", "외과", "이비인후과", "치과", "한의원")
NAME_NOISE_KEYWORDS = ("영수증","계산서","약제비","금액","본인부담","보험자","급여","비급여","현금","카드","교부번호",
    "성명","조제약사","사업장","소재지","발행일","서비스","환자정보","병원정보","복약안내","주의사항","약품사진","식후",
    "식전","공복","아침","점심","저녁","취침전","보관","밀폐용기","기밀용기","차광보관","원형정제","장방형","필름코팅정",
    "분말","결정성","항생제","진통제","소염","항염","면역","작용","치료","개선","위장","증상","설사","금주","전문가","복용",)


def extract_metadata(all_tokens: list[OcrToken], all_lines: list[str]) -> dict[str, str | None]:
    dispensed_date = _extract_dispensed_date(all_tokens, all_lines)
    pharmacy_name = _extract_pharmacy_name(all_tokens, all_lines)
    hospital_name = _extract_hospital_name(all_lines)

    return {
        "dispensedDate": dispensed_date,
        "hospitalName": hospital_name,
        "pharmacyName": pharmacy_name,
    }


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
