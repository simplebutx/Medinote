# OCR 줄 텍스트에서 약 이름 + 투약량 + 횟수 + 일수를 최대한 뽑고, 여러 후보 중 제일 그럴듯한 걸 고르는 파일
import re

from app.services.ocr.ocr_clients import OcrToken


# =========================
# 0. 판단 기준 상수
# =========================
# 각 헤더 단어
MEDICINE_HEADER_LABELS = ["약품명", "약명", "품명"]
DOSAGE_HEADER_LABELS = ["투약량", "투약", "용량"]
FREQUENCY_HEADER_LABELS = ["횟수", "회수", "회"]
DAYS_HEADER_LABELS = ["일수", "일분"]
# 약 이름처럼 보이는지 판단할 때 쓰는 제형/형태 힌트
FORMULATION_HINTS = (
    "정","캡슐","캅셀","시럽","현탁액","내복액","과립","겔","크림","연고","점안액",
    "패취","패치","주사액","주사","산","액","가글","활명수",)
# 이 단어가 들어가면 약 이름 후보로 보면 안된다 (잡음 필터)
NAME_NOISE_KEYWORDS = ("영수증","계산서","약제비","금액","본인부담","보험자","급여","비급여","현금","카드","교부번호",
    "성명","조제약사","사업장","소재지","발행일","서비스","환자정보","병원정보","복약안내","주의사항","약품사진","식후",
    "식전","공복","아침","점심","저녁","취침전","보관","밀폐용기","기밀용기","차광보관","원형정제","장방형","필름코팅정",
    "분말","결정성","항생제","진통제","소염","항염","면역","작용","치료","개선","위장","증상","설사","금주","전문가","복용",
    "필요시","붙이는","형약","주의","목적","완화","사용","부위","바르는","넣는","환부",
    "소아","분할","용량형","혼합형","밀집형","라벨형","영수증형","약봉투","복약지도","수출명","성분명",)
# 약 설명 문장에 자주 나오는 단어들 -> 약 이름에서 제외 목록
DESCRIPTION_NOISE_KEYWORDS = (
    "통증","조절","보충","비타민제","변비약","용하는","증상","목적",
    "완화", "염증","부종","위산","속쓰","감기약","졸음","용량확인","분할주의",)
# 약 이름 옆에 붙는 약효 분류명 제거 목록
CLASSIFICATION_NOISE_FRAGMENTS = (
    "제산제","항히스타민제","항히스타민","해열진통제","소염진통제","소염효소제","위장운동조절제","혈압강하제","혈당강하제","비타민제","점안제",)
# 작은표나 약목록 블록을 읽다가 멈추는 기준 단어
BREAK_MARKERS = ("아침", "점심", "저녁", "취침전", "식후", "식전", "공복", "표시대로", "baropharm.com")


# 메인: 3방식으로 뽑아보고 각각 점수를 매기고 제일 높은 후보를 메인으로 선택
def extract_medicines(_all_tokens: list[OcrToken], all_lines: list[str]) -> list[dict[str, str | None]]:
    # 3가지 방식으로 약 목록 후보를 뽑기
    guide_line_medicines = _extract_medicines_from_guide_lines(all_lines)  # 큰표: 약품명 뒤에 대괄호 설명형
    administration_line_medicines = _extract_medicines_from_administration_lines(all_lines)  # 큰표: 복약안내 문장형
    summary_line_medicines = _extract_medicines_from_summary_lines(all_lines)  # 작은표

    candidates = {
        "guide_lines": guide_line_medicines,
        "administration_lines": administration_line_medicines,
        "summary_lines": summary_line_medicines,
    }
    # 가장 점수가 높은 후보 선택
    selected_source, medicines = max(
        candidates.items(),
        key=lambda item: _score_medicine_candidates(item[1]),
    )

    # 공통 복약 스케줄 추출 (추후 보강용)
    schedule = _extract_schedule_strict(all_lines)

    # 선택되지 않은 후보에서 누락된 약 보충
    for supplemental_medicines in (
        administration_line_medicines,
        summary_line_medicines,
    ):
        if supplemental_medicines is not medicines:
            _merge_missing_medicines(medicines, supplemental_medicines)

    # 빠진 투약량/횟수/일수를 공통 스케줄로 채움
    _apply_schedule_defaults(medicines, schedule)

    # 최종 약명 정리
    medicines = _finalize_medicines(medicines)

    print(
        "OCR extractor debug | "
        f"guide_lines={guide_line_medicines} | "
        f"administration_lines={administration_line_medicines} | "
        f"summary_lines={summary_line_medicines} | "
        f"schedule={schedule} | "
        f"selected_source={selected_source} | "
        f"selected={medicines}",
        flush=True,
    )

    return medicines


# =========================================================
# 큰표: 복약안내 문장형
def _extract_medicines_from_administration_lines(lines: list[str]) -> list[dict[str, str | None]]:
    medicines: list[dict[str, str | None]] = []
    # 단위 패턴 (표준)
    standard_pattern = re.compile(
        r"(?P<dosage>\d+(?:\.\d+)?)\s*"
        r"(?:정|캡슐|캅셀|포|봉|스푼|병|mL|ml)\s*씩?\s*"
        r"(?P<frequency>\d+)\s*회"
        r"(?:\s*(?P<days>\d+)\s*일분)?"
    )
    # 필요시 복용 패턴
    as_needed_pattern = re.compile(
        r"(?P<dosage>\d+(?:\.\d+)?)\s*"
        r"(?:정|캡슐|캅셀|포|봉|스푼|병|매|mL|ml)\s*"
        r"필요\s*시"
    )
    # 필요시 + 단위 패턴
    as_needed_after_pattern = re.compile(
        r"(?P<name>.+?)\s+필요\s*시\s*"
        r"(?P<dosage>\d+(?:\.\d+)?)\s*"
        r"(?:방울|정|캡슐|캅셀|포|봉|스푼|병|매|mL|ml)"
    )
    # 점안액 패턴
    drop_pattern = re.compile(
        r"(?P<dosage>\d+(?:\.\d+)?)\s*"
        r"(?:눈\s*에\s*)?방울\s*씩.*?"
        r"(?P<frequency>\d+)\s*회"
    )
    # 외용제, 연고류 패턴
    external_pattern = re.compile(r"(?P<name>.+?)\s+1\s*(?:입안\s*)?일\s*수\s*회")
    daily_range_pattern = re.compile(r"(?P<name>.+?)\s+1\s*일\s*(?P<frequency_min>\d+)\s*(?:~|-)\s*(?P<frequency_max>\d+)\s*회")

    # 한줄씩 검사하면서 약정보 추출
    for index, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        # 단위 패턴 (표준)
        for match in standard_pattern.finditer(stripped):
            prefix = stripped[: match.start()]
            name = _extract_administration_name_prefix(prefix)
            _append_medicine(
                medicines,
                name,
                match.group("dosage"),
                match.group("frequency"),
                match.group("days"),
            )

        # 필요시 복용 패턴
        for match in as_needed_pattern.finditer(stripped):
            name = _extract_administration_name_prefix(stripped[: match.start()])
            _append_medicine(medicines, name, match.group("dosage"), None, None, as_needed=True)

        # 필요시 + 단위 패턴
        for match in as_needed_after_pattern.finditer(stripped):
            _append_medicine(medicines, match.group("name"), match.group("dosage"), None, None, as_needed=True)

        # 점안액 패턴
        for match in drop_pattern.finditer(stripped):
            name = _extract_administration_name_prefix(stripped[: match.start()])
            _append_medicine(medicines, name, match.group("dosage"), match.group("frequency"), None)

        # 외용제, 연고류 패턴
        external_match = external_pattern.search(stripped)
        if external_match:
            _append_medicine(medicines, external_match.group("name"), "1", "1", None)

        daily_range_match = daily_range_pattern.search(stripped)
        if daily_range_match:
            _append_medicine(medicines, daily_range_match.group("name"), "1", daily_range_match.group("frequency_max"), None)

    return medicines


def _extract_administration_name_prefix(prefix: str) -> str | None:
    cleaned = re.sub(r"^(?:\d+\s*)+", "", prefix).strip()
    cleaned = re.sub(r".*(?:약품사진|약품명|복약안내|주의사항|상호|발행일)\s*", "", cleaned).strip()
    cleaned = re.sub(r"^\d{4}-\d{2}-\d{2}\s*", "", cleaned).strip()
    return _finalize_name(cleaned)


# =========================================================
# 큰표: 약품명 뒤에 대괄호 설명형
def _extract_medicines_from_guide_lines(lines: list[str]) -> list[dict[str, str | None]]:
    medicines: list[dict[str, str | None]] = []

    # 한줄씩 보고 대괄호 없으면 패스
    for line in lines:
        stripped = line.strip()
        if "[" not in stripped:
            continue
        
        # [ 앞부분을 약명으로 취급
        name = _extract_name_before_bracket(stripped)
        if name is None:
            continue

        # 같은 줄에서 투약량/횟수/일수 추출 (1정씩3회3일분)
        dosage = _extract_dosage_from_bracket_line(stripped)
        frequency = _extract_pattern_value(stripped, r"(\d+)\s*회")
        days = _extract_pattern_value(stripped, r"(\d+)\s*일분")
        _append_medicine(medicines, name, dosage, frequency, days)

    return medicines


# =========================================================
# 작은표에서 약 정보 읽기 (줄 텍스트 기반 - 같은 y축끼리 묶어서 한줄로 )
def _extract_medicines_from_summary_lines(lines: list[str]) -> list[dict[str, str | None]]:
    medicines: list[dict[str, str | None]] = []
    # 작은 표 헤더 찾기 (약품명 투약량 횟수 일수)
    header_indexes = [
        index
        for index, line in enumerate(lines)
        if (
            _contains_all_labels(line, DOSAGE_HEADER_LABELS)
            and _contains_all_labels(line, FREQUENCY_HEADER_LABELS)
            and _contains_all_labels(line, DAYS_HEADER_LABELS)
            or _looks_like_summary_header(line)
        )
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

    # 표 본문만 추출 (BREAK_MARKERS 기준으로 멈추기)
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

    # 각 줄에서 약명과 숫자 뽑기 (지르텍정 1 1 4)
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

        # 숫자만 다음 줄/이전 줄로 떨어진 경우 보정
        if index + 1 < len(block) and _is_summary_count_only_line(block[index + 1]):
            next_counts = _extract_counts_from_count_line(block[index + 1])
            dosage = dosage or next_counts[0]
            frequency = frequency or next_counts[1]
            days = days or next_counts[2]

        _append_medicine(medicines, name, dosage, frequency, days)

    return medicines



def _looks_like_summary_header(line: str) -> bool:
    compact = line.replace(" ", "")
    return (
        "약품명" in compact
        and ("투약량" in compact or "량" in compact)
        and ("횟" in compact or "횟수" in compact or "회" in compact)
        and ("일" in compact or "일수" in compact)
    )


# =========================================================
# 공통 스케줄 보정

# 스케쥴 정보칸에서 투약량/횟수/일수 읽기 (공통 복약 규칙)
def _extract_schedule_strict(lines: list[str]) -> dict[str, str | None]:
    dosage = None
    frequency = None
    days = None

    # 공백 제거
    compact_lines = [line.replace(" ", "") for line in lines if line.strip()]
    # 여러 줄을 붙여서 검사
    windows: list[str] = []
    for index in range(len(compact_lines)):
        windows.append(compact_lines[index])
        if index + 1 < len(compact_lines):
            windows.append(compact_lines[index] + compact_lines[index + 1])
        if index + 2 < len(compact_lines):
            windows.append(compact_lines[index] + compact_lines[index + 1] + compact_lines[index + 2])

    for compact in reversed(windows):
        if frequency is None:
            match = re.search(r"1일(\d+)회", compact)  # 하루 횟수 찾기
            if not match:
                match = re.search(r"(\d+)회.*1일", compact)
            if match:
                frequency = match.group(1)
        if days is None:
            match = re.search(r"투약일수(\d+)", compact)  # 일수 찾기
            if not match:
                match = re.search(r"(\d+)일분", compact)
            if match:
                days = match.group(1)
        if dosage is None:
            match = re.search(r"1(?:정|캡슐|포|봉|스푼)", compact)  # 투약량 찾기
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
        is_as_needed = medicine.get("as_needed") == "true"
        if is_as_needed:
            medicine["frequency"] = None
            medicine["days"] = None
        medicine["dosage"] = _normalize_dosage_value(medicine.get("dosage"))
        medicine["frequency"] = _normalize_count_value(medicine.get("frequency"), maximum=12)
        medicine["days"] = _normalize_count_value(medicine.get("days"), maximum=60)
        if medicine.get("dosage") is None:
            medicine["dosage"] = schedule.get("dosage")
        if not is_as_needed and medicine.get("frequency") is None:
            medicine["frequency"] = schedule.get("frequency")
        if not is_as_needed and medicine.get("days") is None:
            medicine["days"] = schedule.get("days")
        if (
            not is_as_needed
            and medicine.get("frequency") is not None
            and schedule.get("frequency") is not None
        ):
            try:
                if int(medicine["frequency"]) > int(schedule["frequency"]):
                    medicine["frequency"] = schedule["frequency"]
            except ValueError:
                pass
        if medicine.get("days") is not None:
            medicine["days"] = medicine["days"].lstrip("0") or "0"
        if medicine.get("frequency") is not None:
            medicine["frequency"] = medicine["frequency"].lstrip("0") or "0"
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
        elif (
            medicine.get("frequency") == schedule.get("frequency")
            and medicine.get("days")
            and schedule.get("days")
        ):
            try:
                if int(medicine["days"]) > int(schedule["days"]):
                    medicine["days"] = schedule["days"]
            except ValueError:
                pass


# =========================================================
# 후보 병합과 최종 리스트 처리
# =========================
def _merge_missing_medicines(
    medicines: list[dict[str, str | None]],
    candidates: list[dict[str, str | None]],
) -> None:
    for candidate in candidates:
        candidate_name = _finalize_name(candidate.get("name"))
        if candidate_name is None:
            continue
        existing = next((existing for existing in medicines if _names_overlap(existing.get("name"), candidate_name)), None)
        if existing is not None:
            existing["name"] = _prefer_cleaner_name(existing.get("name"), candidate_name) or existing["name"]
            if candidate.get("as_needed") == "true":
                existing["as_needed"] = "true"
                existing["frequency"] = None
                existing["days"] = None
            elif candidate.get("frequency") is not None:
                try:
                    existing_frequency = float(existing["frequency"]) if existing.get("frequency") is not None else 0
                    candidate_frequency = float(candidate["frequency"])
                    if candidate_frequency > existing_frequency:
                        existing["frequency"] = candidate["frequency"]
                except ValueError:
                    pass
            if existing.get("days") is None and candidate.get("days") is not None:
                existing["days"] = candidate["days"]
            continue
        _append_medicine(
            medicines,
            candidate_name,
            candidate.get("dosage"),
            candidate.get("frequency"),
            candidate.get("days"),
        )


def _names_overlap(left: str | None, right: str | None) -> bool:
    left_name = _finalize_name(left)
    right_name = _finalize_name(right)
    if left_name is None or right_name is None:
        return False
    return left_name in right_name or right_name in left_name


def _prefer_cleaner_name(left: str | None, right: str | None) -> str | None:
    left_name = _finalize_name(left)
    right_name = _finalize_name(right)
    if left_name is None:
        return right_name
    if right_name is None:
        return left_name
    if left_name == right_name:
        return left_name

    left_score = _medicine_name_quality(left_name)
    right_score = _medicine_name_quality(right_name)
    if right_score > left_score:
        return right_name
    if left_score > right_score:
        return left_name
    return min((left_name, right_name), key=len)



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



# 약 리스트에 추가/병합
def _append_medicine(
    medicines: list[dict[str, str | None]],
    name: str | None,
    dosage: str | None,
    frequency: str | None,
    days: str | None,
    as_needed: bool = False,
) -> None:
    cleaned_name = _finalize_name(name)
    if cleaned_name is None:
        return
    dosage = _normalize_dosage_value(dosage)
    frequency = _normalize_count_value(frequency, maximum=12)
    days = _normalize_count_value(days, maximum=60)

    existing = next((medicine for medicine in medicines if medicine["name"] == cleaned_name), None)
    if existing is None:
        medicines.append(
            {
                "name": cleaned_name,
                "dosage": dosage,
                "frequency": frequency,
                "days": days,
                "as_needed": "true" if as_needed else None,
            }
        )
        return

    existing["name"] = _prefer_cleaner_name(existing.get("name"), cleaned_name) or existing["name"]
    if as_needed:
        existing["as_needed"] = "true"
    if existing.get("dosage") is None and dosage is not None:
        existing["dosage"] = dosage
    if existing.get("frequency") is None and frequency is not None:
        existing["frequency"] = frequency
    if existing.get("days") is None and days is not None:
        existing["days"] = days



# =========================
# 대괄호/작은표 보조 함수
# =========================
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
    trailing_counts = _extract_trailing_counts(name)
    if trailing_counts is not None:
        name = trailing_counts[0]
    else:
        name = re.sub(r"(?:\d+\s*\.\.\.\s*\d+|\d+\s+\d+\s+\d+|\d+\s+\d+|\d+\.\d+\d*)$", "", name).strip()
    return _finalize_name(name)



# 작은표 한줄에서 dosage / frequency / days를 추출
def _extract_summary_counts(line: str) -> tuple[str | None, str | None, str | None]:
    dosage = _extract_dosage_from_bracket_line(line)
    frequency = None
    days = None

    trailing_counts = _extract_trailing_counts(line)
    decoded = trailing_counts[1] if trailing_counts is not None else _decode_compact_count_blob(_extract_summary_tail(line))
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
    if _has_formulation_hint(compact):
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


def _extract_trailing_counts(line: str) -> tuple[str, list[str]] | None:
    stripped = re.sub(r"^[▶•*xX]+\s*", "", line).strip()
    separated_match = re.search(
        r"^(?P<name>.+?)\s+(?P<dosage>\d+(?:\.\d+)?)\s+(?P<frequency>\d+)\s+(?P<days>\d{1,2})$",
        stripped,
    )
    if separated_match:
        return (
            separated_match.group("name").strip(),
            [
                separated_match.group("dosage"),
                separated_match.group("frequency"),
                separated_match.group("days"),
            ],
        )

    separated_partial_match = re.search(
        r"^(?P<name>.+?)\s+(?P<dosage>\d+(?:\.\d+)?)\s+(?P<frequency>\d+)$",
        stripped,
    )
    if separated_partial_match:
        return (
            separated_partial_match.group("name").strip(),
            [
                separated_partial_match.group("dosage"),
                separated_partial_match.group("frequency"),
            ],
        )

    compact = stripped.replace(" ", "")
    decimal_match = re.search(r"(0\.\d{2,3})$", compact)
    if decimal_match:
        name = compact[: decimal_match.start()]
        decoded = _decode_compact_count_blob(decimal_match.group(1))
        if decoded and _finalize_name(name) is not None:
            return name, decoded

    trailing_match = re.search(r"(\d{3,4})$", compact)
    if not trailing_match:
        two_digit_match = re.search(r"(\d{2})$", compact)
        if two_digit_match:
            name = compact[: two_digit_match.start()]
            decoded = _decode_compact_count_blob(two_digit_match.group(1))
            if decoded and _finalize_name(name) is not None:
                return name, decoded
        return None

    digits = trailing_match.group(1)
    suffix_lengths = [3]
    if len(digits) == 4 and digits[0] == digits[1] and 10 <= int(digits[2:4]) <= 31:
        suffix_lengths.insert(0, 4)
    else:
        suffix_lengths.append(4)

    for suffix_length in suffix_lengths:
        if len(digits) < suffix_length:
            continue
        suffix = digits[-suffix_length:]
        name = compact[: len(compact) - suffix_length]
        decoded = _decode_compact_count_blob(suffix)
        if decoded and _finalize_name(name) is not None:
            return name, decoded

    return None



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
    if match := re.fullmatch(r"(\d)(\d)", compact):
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



# 특정 줄 구간 안에 요약표처럼 보이는 약 이름 줄이 실제로 있는지 확인하는 함수
def _has_medicine_like_summary_lines(lines: list[str], start: int, end: int) -> bool:
    for line in lines[start:end]:
        if _extract_name_from_summary_line(line) is not None:
            return True
    return False



# =========================
# 후보 점수화
# =========================
# 추출된 약 목록이 얼마나 그럴듯한지 점수로 계산해서 최종 후보 선택에 쓰는 함수
def _score_medicine_candidates(medicines: list[dict[str, str | None]]) -> int:
    score = 0
    valid_count = 0
    invalid_count = 0
    for medicine in medicines:
        name = medicine.get("name") or ""
        if _looks_like_medicine_name(name):
            score += 3
            valid_count += 1
        else:
            score -= 8
            invalid_count += 1
        score += 1 if medicine.get("dosage") else 0
        score += 1 if medicine.get("frequency") else 0
        score += 1 if medicine.get("days") else 0
        if medicine.get("dosage") is None:
            score -= 2
        if not _is_plausible_dosage(medicine.get("dosage")):
            score -= 10
        if not _is_plausible_small_count(medicine.get("frequency"), maximum=12):
            score -= 10
        if not _is_plausible_small_count(medicine.get("days"), maximum=60):
            score -= 10
        compact_name = name.replace(" ", "")
        if _has_name_noise(compact_name):
            score -= 12
        if re.search(r"\d{3,}(?:졸음|운전|과량|위장|식전|당분|간격)?주의", compact_name):
            score -= 8
        if medicine.get("frequency") == "0" or medicine.get("days") == "0":
            score -= 8
        if len(compact_name) > 24:
            score -= 4
    if valid_count:
        score += valid_count
    if invalid_count > valid_count:
        score -= (invalid_count - valid_count) * 6
    return score


def _medicine_name_quality(name: str) -> int:
    compact = name.replace(" ", "")
    score = 0
    if any(hint in compact for hint in FORMULATION_HINTS):
        score += 6
    if re.search(r"\d+(?:\.\d+)?(?:밀리그램|mg|mL|ml)", compact, flags=re.IGNORECASE):
        score += 2
    if _has_name_noise(compact):
        score -= 10
    if any(keyword in compact for keyword in DESCRIPTION_NOISE_KEYWORDS):
        score -= 8
    if len(compact) > 22:
        score -= len(compact) - 22
    if re.search(r"(?:목적|완화|주의|보관|복용|사용|바르는|넣는|붙이는|증상|부위)", compact):
        score -= 8
    return score



# =========================
# 약명 정리와 검증
# =========================
# 약 이름 후보를 마지막으로 정리해서 공백, 특수문자, 이상한 꼬리를 제거
def _finalize_name(name: str | None) -> str | None:
    if not name:
        return None

    cleaned = _clean_medicine_name(name)
    cleaned = cleaned.replace(" ", "")
    cleaned = re.sub(r"\[(.*?)$", "", cleaned)
    cleaned = re.sub(r"\((.*?)$", "", cleaned)
    cleaned = re.sub(rf"^[가-힣A-Za-z]{{1,8}}[:：](?=.+(?:{'|'.join(FORMULATION_HINTS)}))", "", cleaned)
    cleaned = re.sub(r"(약효>|효능>).*", "", cleaned)
    cleaned = _normalize_medicine_ocr_variants(cleaned)
    cleaned = _trim_after_first_medicine_name(cleaned)
    cleaned = _strip_description_tail(cleaned)
    cleaned = _strip_classification_noise(cleaned)
    cleaned = _strip_administration_suffix(cleaned)
    cleaned = re.sub(r"(밀리그|밀리)$", "밀리그램", cleaned)
    cleaned = re.sub(r"(?:정|캡슐|시럽|겔|산|과립)(?:\d+)$", lambda m: m.group(0).rstrip("0123456789"), cleaned)
    cleaned = re.sub(r"(mg|ml|mL)\d+$", r"\1", cleaned)
    cleaned = re.sub(r"(\d+)m$", r"\1mg", cleaned)
    cleaned = re.sub(r"(?<!mg)(?<!ml)(?<!mL)\d{1,2}$", "", cleaned)
    cleaned = re.sub(r"^[▶•*xX]+", "", cleaned)
    cleaned = cleaned.strip("·-:,.()")
    cleaned = re.sub(r"^[Iil|]+(?=[가-힣])", "", cleaned)
    if cleaned in {"정", "캡슐", "캅셀", "시럽", "겔", "크림", "연고", "패취", "패치", "주사", "주사제", "산", "액", "제산"}:
        return None
    if re.match(r"^(?:액|정|산|겔|크림|연고|시럽|캡슐|캅셀|패치|패취)[)\]}]", cleaned):
        return None
    formulation = r"(?:정|캡슐|캅셀|시럽|내복액|겔|크림|연고|점안액|패취|주사액|주사)"
    if re.search(rf"{formulation}\d{{2,}}.*{formulation}", cleaned):
        return None
    if "약국" in cleaned or cleaned.startswith(("병원", "약품명")):
        return None
    if cleaned.endswith(("과", "와", "및", "을", "를", "에", "의", "로", "으로")):
        return None
    if re.fullmatch(r"[가-힣A-Za-z]*(?:목적|완화|주의|보관|복용|사용|증상|부위)[가-힣A-Za-z]*", cleaned):
        return None
    if _has_name_noise(cleaned):
        return None
    if any(keyword in cleaned for keyword in DESCRIPTION_NOISE_KEYWORDS):
        return None
    if len(cleaned) > 20 and any(keyword in cleaned for keyword in ("면역", "항염", "작용", "증상", "치료", "보관", "개선")):
        return None
    if any(color in cleaned for color in ("흰색", "백색", "황색", "분홍색", "초록", "연녹색")) and (
        "정제" in cleaned or "캡슐" in cleaned
    ):
        return None

    if not _looks_like_medicine_name(cleaned):
        return None
    return cleaned


def _normalize_medicine_ocr_variants(name: str) -> str:
    cleaned = name
    cleaned = cleaned.replace("밀리그람", "밀리그램")
    cleaned = cleaned.replace("밀리그렘", "밀리그램")
    cleaned = cleaned.replace("미리그램", "밀리그램")
    cleaned = cleaned.replace("미리그람", "밀리그램")
    cleaned = cleaned.replace("엠지", "mg")
    cleaned = cleaned.replace("미리리터", "mL")
    cleaned = cleaned.replace("밀리리터", "mL")
    cleaned = cleaned.replace("패취", "패치")
    return cleaned


def _trim_after_first_medicine_name(name: str) -> str:
    compact = name.replace(" ", "")
    if len(compact) <= 18:
        return compact

    formulation_pattern = "|".join(sorted(map(re.escape, FORMULATION_HINTS), key=len, reverse=True))
    match = re.match(
        rf"^(.+?(?:{formulation_pattern})(?:\d+(?:\.\d+)?(?:밀리그램|mg|mL|ml))?)",
        compact,
        flags=re.IGNORECASE,
    )
    if not match:
        return compact

    candidate = match.group(1)
    rest = compact[match.end() :]
    if not rest:
        return compact
    if any(keyword in rest for keyword in DESCRIPTION_NOISE_KEYWORDS + NAME_NOISE_KEYWORDS):
        return candidate
    if re.search(r"(?:1일|1정|1캡슐|1포|1봉|1병|필요시|식전|식후|주의|목적|완화|증상|부위|바르는|넣는|붙이는)", rest):
        return candidate
    return compact


def _strip_description_tail(name: str) -> str:
    compact = name.replace(" ", "")
    split_keywords = (
        "약효",
        "효능",
        "수출명",
        "성분명",
        "목적",
        "완화",
        "증상",
        "부위",
        "바르는",
        "넣는",
        "붙이는",
        "복용",
        "사용",
        "주의",
        "보관",
        "항생제",
        "소화제",
        "소염",
        "진통제",
    ) + DESCRIPTION_NOISE_KEYWORDS

    for keyword in split_keywords:
        index = compact.find(keyword)
        if index <= 1:
            continue
        prefix = compact[:index]
        if _has_formulation_hint(prefix):
            return prefix
    return compact


def _has_formulation_hint(text: str) -> bool:
    return any(hint in text for hint in FORMULATION_HINTS)


# =========================
# 값 검증/정규화 유틸
# =========================
def _has_name_noise(text: str) -> bool:
    compact = text.replace(" ", "")
    return any(keyword in compact for keyword in NAME_NOISE_KEYWORDS)


def _is_plausible_dosage(value: str | None) -> bool:
    if value is None:
        return True
    try:
        number = float(value)
    except ValueError:
        return False
    return 0 < number <= 30


def _normalize_dosage_value(value: str | None) -> str | None:
    if value is None:
        return None
    return value if _is_plausible_dosage(value) else None


def _normalize_count_value(value: str | None, maximum: int) -> str | None:
    if value is None:
        return None
    return value if _is_plausible_small_count(value, maximum=maximum) else None


def _is_plausible_small_count(value: str | None, maximum: int) -> bool:
    if value is None:
        return True
    try:
        number = float(value)
    except ValueError:
        return False
    return number.is_integer() and 0 < number <= maximum


def _strip_classification_noise(name: str) -> str:
    cleaned = name
    for fragment in CLASSIFICATION_NOISE_FRAGMENTS:
        cleaned = cleaned.replace(fragment, "")
    return cleaned



def _strip_administration_suffix(name: str) -> str:
    stripped = re.sub(
        r"\d+(?:\.\d+)?(?:정|캡슐|캅셀|포|봉|스푼|병|매|mL|ml)씩.*$",
        "",
        name,
    )
    stripped = re.sub(r"\d+(?:\.\d+)?(?:정|캡슐|캅셀|포|봉|스푼|병|매|mL|ml)?필요시.*$", "", stripped)
    stripped = re.sub(r"\d+회\d+일분.*$", "", stripped)
    stripped = re.sub(r"\d+일\d+(?:~|-)?\d*회.*$", "", stripped)
    stripped = re.sub(r"\d+일(?:수회)?$", "", stripped)
    stripped = re.sub(r"(?:졸음|운전|과량|위장|식전|당분|간격)?주의.*$", "", stripped)
    return stripped



# =========================
# 공용 문자열 유틸
# =========================
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
    if any(keyword in compact for keyword in DESCRIPTION_NOISE_KEYWORDS) and not _has_formulation_hint(compact):
        return False
    if re.fullmatch(r"(?:정|액|산|겔|크림|연고|시럽|캡슐|캅셀|패치|패취|주사|점안액)", compact):
        return False
    if re.search(r"\d+(?:\.\d+)?(?:밀리그램|mg|mL|ml)", compact, flags=re.IGNORECASE):
        return True
    return _has_formulation_hint(compact)



# 문자열 안에 특정 라벨 목록이 전부 들어 있는지 확인
def _contains_all_labels(text: str, labels: list[str]) -> bool:
    normalized = _normalize_anchor_text(text)
    return any(_normalize_anchor_text(label) in normalized for label in labels)



# 문자열 안에 특정 라벨 목록 중 하나라도 들어 있는지 확인
def _contains_any_label(text: str, labels: list[str]) -> bool:
    normalized = _normalize_anchor_text(text)
    return any(_normalize_anchor_text(label) in normalized for label in labels)



# anchor 탐색 전에 텍스트를 비교하기 쉽게 정규화
def _normalize_anchor_text(text: str) -> str:
    return re.sub(r"[^0-9A-Za-z가-힣]", "", text).lower()



# 정규식 패턴으로 문자열에서 원하는 값 하나를 뽑아내는 공용 함수
def _extract_pattern_value(text: str, pattern: str) -> str | None:
    match = re.search(pattern, text.replace(" ", ""))
    return match.group(1) if match else None
