from __future__ import annotations

import argparse
import base64
import html
import json
import mimetypes
import os
import sys
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable
import re


PROVIDER_LABELS = {
    "google": "Google Vision OCR",
    "naver": "NAVER CLOVA OCR",
    "azure": "Azure AI Vision OCR",
    "truth": "Answer Text",
}

PROVIDER_NOTES = {
    "google": "Cloud OCR / document_text_detection / current Medinote baseline",
    "naver": "Cloud OCR / Korean document OCR comparison candidate",
    "azure": "Cloud OCR / Microsoft Azure Read API Korean-supported candidate",
    "truth": "Human-written reference text from the input image",
}


@dataclass
class OcrResult:
    provider: str
    label: str
    status: str
    elapsed_ms: int
    raw_text: str
    line_count: int
    char_count: int
    error: str = ""
    note: str = ""
    raw_cer: float | None = None
    normalized_cer: float | None = None
    keyword_hit_rate: float | None = None
    keyword_hits: int | None = None
    keyword_total: int | None = None
    missing_keywords: list[str] | None = None
    noise_count: int | None = None


def read_bytes(path: Path) -> bytes:
    return path.read_bytes()


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    return value.replace("\r\n", "\n").replace("\r", "\n").strip()


def normalize_for_metric(value: str | None) -> str:
    text = normalize_text(value)
    text = text.lower()
    text = re.sub(r"[□☐▢■▪●•·,.:;!?()\[\]{}<>/\\|\"'`~_\-+=*]", "", text)
    text = re.sub(r"\s+", "", text)
    return text


def levenshtein_distance(left: str, right: str) -> int:
    if left == right:
        return 0
    if not left:
        return len(right)
    if not right:
        return len(left)
    if len(left) < len(right):
        left, right = right, left

    previous = list(range(len(right) + 1))
    for i, left_char in enumerate(left, start=1):
        current = [i]
        for j, right_char in enumerate(right, start=1):
            insert_cost = current[j - 1] + 1
            delete_cost = previous[j] + 1
            substitute_cost = previous[j - 1] + (0 if left_char == right_char else 1)
            current.append(min(insert_cost, delete_cost, substitute_cost))
        previous = current
    return previous[-1]


def cer(reference: str, hypothesis: str, *, normalized: bool = False) -> float:
    ref = normalize_for_metric(reference) if normalized else normalize_text(reference)
    hyp = normalize_for_metric(hypothesis) if normalized else normalize_text(hypothesis)
    if not ref:
        return 0.0 if not hyp else 1.0
    return levenshtein_distance(ref, hyp) / len(ref)


def fuzzy_contains(normalized_text: str, normalized_keyword: str, threshold: float = 0.86) -> bool:
    if not normalized_keyword:
        return True
    if normalized_keyword in normalized_text:
        return True
    keyword_len = len(normalized_keyword)
    if keyword_len <= 3:
        return False

    min_len = max(1, int(keyword_len * 0.75))
    max_len = min(len(normalized_text), int(keyword_len * 1.25) + 1)
    best = 0.0
    for window_len in range(min_len, max_len + 1):
        for start in range(0, max(0, len(normalized_text) - window_len) + 1):
            window = normalized_text[start:start + window_len]
            distance = levenshtein_distance(normalized_keyword, window)
            similarity = 1 - (distance / max(keyword_len, window_len))
            if similarity > best:
                best = similarity
            if best >= threshold:
                return True
    return False


def count_noise(raw_text: str) -> int:
    noise = 0
    for line in normalize_text(raw_text).splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        compact = re.sub(r"\s+", "", stripped)
        has_korean = bool(re.search(r"[\uac00-\ud7a3]", compact))
        has_digit = bool(re.search(r"\d", compact))
        has_alpha = bool(re.search(r"[A-Za-z]", compact))
        if len(compact) == 1 and not has_korean and not has_digit:
            noise += 1
        elif not has_korean and not has_digit and re.fullmatch(r"[\W_]+", compact):
            noise += 1
        elif has_alpha and not has_korean and not has_digit and len(compact) <= 4:
            noise += 1
    return noise


def apply_metrics(results: list[OcrResult], truth_text: str | None, keywords: list[str]) -> None:
    normalized_keywords = [(keyword, normalize_for_metric(keyword)) for keyword in keywords if keyword.strip()]
    for result in results:
        if truth_text is not None:
            result.raw_cer = cer(truth_text, result.raw_text, normalized=False)
            result.normalized_cer = cer(truth_text, result.raw_text, normalized=True)
        if normalized_keywords:
            normalized_output = normalize_for_metric(result.raw_text)
            missing: list[str] = []
            hits = 0
            for original, normalized_keyword in normalized_keywords:
                if fuzzy_contains(normalized_output, normalized_keyword):
                    hits += 1
                else:
                    missing.append(original)
            result.keyword_hits = hits
            result.keyword_total = len(normalized_keywords)
            result.keyword_hit_rate = hits / len(normalized_keywords) if normalized_keywords else None
            result.missing_keywords = missing
        result.noise_count = count_noise(result.raw_text)


def elapsed_call(provider: str, fn: Callable[[], str]) -> OcrResult:
    start = time.perf_counter()
    try:
        raw_text = normalize_text(fn())
        status = "ok" if raw_text else "empty"
        error = ""
    except Exception as exc:  # noqa: BLE001 - report tool should keep going.
        raw_text = ""
        status = "error"
        error = str(exc)
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    lines = [line for line in raw_text.splitlines() if line.strip()]
    return OcrResult(
        provider=provider,
        label=PROVIDER_LABELS[provider],
        status=status,
        elapsed_ms=elapsed_ms,
        raw_text=raw_text,
        line_count=len(lines),
        char_count=len(raw_text),
        error=error,
        note=PROVIDER_NOTES[provider],
    )


def skip_result(provider: str, reason: str) -> OcrResult:
    return OcrResult(
        provider=provider,
        label=PROVIDER_LABELS[provider],
        status="skipped",
        elapsed_ms=0,
        raw_text="",
        line_count=0,
        char_count=0,
        error=reason,
        note=PROVIDER_NOTES[provider],
    )


def truth_result(truth_text: str | None) -> OcrResult:
    raw_text = normalize_text(truth_text or "")
    lines = [line for line in raw_text.splitlines() if line.strip()]
    return OcrResult(
        provider="truth",
        label=PROVIDER_LABELS["truth"],
        status="reference" if raw_text else "skipped",
        elapsed_ms=0,
        raw_text=raw_text,
        line_count=len(lines),
        char_count=len(raw_text),
        error="" if raw_text else "--truth file was not provided.",
        note=PROVIDER_NOTES["truth"],
    )


def google_ocr(image_path: Path) -> OcrResult:
    has_json = bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON"))
    has_file = bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    if not has_json and not has_file:
        return skip_result("google", "GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS_JSON is not set.")

    def run() -> str:
        from google.auth import load_credentials_from_dict
        from google.cloud import vision

        credentials = None
        if os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON"):
            credentials_info = json.loads(os.environ["GOOGLE_APPLICATION_CREDENTIALS_JSON"])
            credentials, _ = load_credentials_from_dict(
                credentials_info,
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )

        client = vision.ImageAnnotatorClient(credentials=credentials)
        image = vision.Image(content=read_bytes(image_path))
        image_context = vision.ImageContext(language_hints=["ko", "en"])
        response = client.document_text_detection(image=image, image_context=image_context)
        if response.error.message:
            raise RuntimeError(response.error.message)
        return response.full_text_annotation.text if response.full_text_annotation else ""

    return elapsed_call("google", run)


def naver_ocr(image_path: Path) -> OcrResult:
    api_url = os.getenv("NAVER_CLOVA_OCR_URL", "").strip()
    secret = os.getenv("NAVER_CLOVA_OCR_SECRET", "").strip()
    if not api_url or not secret:
        return skip_result("naver", "NAVER_CLOVA_OCR_URL or NAVER_CLOVA_OCR_SECRET is not set.")

    def run() -> str:
        import requests

        mime_type = mimetypes.guess_type(str(image_path))[0] or "image/png"
        extension = image_path.suffix.lower().lstrip(".") or "png"
        payload = {
            "version": "V2",
            "requestId": str(uuid.uuid4()),
            "timestamp": int(time.time() * 1000),
            "images": [
                {
                    "format": extension,
                    "name": image_path.stem,
                    "data": base64.b64encode(read_bytes(image_path)).decode("ascii"),
                }
            ],
        }
        headers = {"X-OCR-SECRET": secret, "Content-Type": "application/json"}
        body = json.dumps(payload)
        candidate_urls = [api_url]
        normalized = api_url.rstrip("/")
        if not normalized.endswith(("/infer", "/general")):
            candidate_urls.extend([f"{normalized}/infer", f"{normalized}/general"])

        response = None
        errors: list[str] = []
        for candidate_url in dict.fromkeys(candidate_urls):
            try:
                response = requests.post(candidate_url, headers=headers, data=body, timeout=60)
                if 200 <= response.status_code < 300:
                    break
                response_text = response.text.strip()
                errors.append(
                    f"{candidate_url}: HTTP {response.status_code}"
                    + (f" - {response_text[:500]}" if response_text else "")
                )
                if response.status_code not in {400, 404}:
                    break
            except requests.RequestException as exc:
                errors.append(f"{candidate_url}: {exc}")
                response = None

        if response is None:
            raise RuntimeError("; ".join(errors))
        if not (200 <= response.status_code < 300):
            raise RuntimeError("; ".join(errors))
        data = response.json()
        fields = data.get("images", [{}])[0].get("fields", [])
        if not fields:
            return ""
        return "\n".join(field.get("inferText", "") for field in fields if field.get("inferText"))

    return elapsed_call("naver", run)


def azure_ocr(image_path: Path) -> OcrResult:
    endpoint = (
        os.getenv("AZURE_VISION_ENDPOINT")
        or os.getenv("VISION_ENDPOINT")
        or ""
    ).strip()
    key = (
        os.getenv("AZURE_VISION_KEY")
        or os.getenv("VISION_KEY")
        or ""
    ).strip()
    if not endpoint or not key:
        return skip_result("azure", "AZURE_VISION_ENDPOINT/VISION_ENDPOINT or AZURE_VISION_KEY/VISION_KEY is not set.")

    def run() -> str:
        import requests

        analyze_url = f"{endpoint.rstrip('/')}/vision/v3.2/read/analyze?language=ko"
        response = requests.post(
            analyze_url,
            headers={
                "Ocp-Apim-Subscription-Key": key,
                "Content-Type": mimetypes.guess_type(str(image_path))[0] or "application/octet-stream",
            },
            data=read_bytes(image_path),
            timeout=60,
        )
        response.raise_for_status()
        operation_url = response.headers.get("Operation-Location")
        if not operation_url:
            raise RuntimeError("Azure response did not include Operation-Location header.")

        result = None
        for _ in range(30):
            poll = requests.get(
                operation_url,
                headers={"Ocp-Apim-Subscription-Key": key},
                timeout=30,
            )
            poll.raise_for_status()
            result = poll.json()
            status = result.get("status")
            if status == "succeeded":
                break
            if status == "failed":
                raise RuntimeError(json.dumps(result, ensure_ascii=False))
            time.sleep(1)
        else:
            raise RuntimeError("Azure OCR polling timed out.")

        read_results = (result or {}).get("analyzeResult", {}).get("readResults", [])
        lines = []
        for page in read_results:
            for line in page.get("lines", []):
                text = line.get("text")
                if text:
                    lines.append(text)
        return "\n".join(lines)

    return elapsed_call("azure", run)


def demo_results(providers: list[str]) -> list[OcrResult]:
    samples = {
        "google": "2026.06.15\nOO약국\n아세트아미노펜정 500mg\n1일 3회 3일분\n식후 30분 복용",
        "naver": "2026.06.15\nOO 약국\n아세트아미노펜정 500mg\n1일 3회 / 3일분\n식후 30분 복용",
        "azure": "2026.06.15\nOO약국\n아세트아미노펜정 500mg\n1일 3회 3일분\n식후 30분 복용",
        "truth": "2026.06.15\nOO약국\n아세트아미노펜정 500mg\n1일 3회 3일분\n식후 30분 복용",
    }
    results: list[OcrResult] = []
    elapsed_by_provider = {
        "google": 820,
        "naver": 940,
        "azure": 760,
        "truth": 0,
    }
    for provider in providers:
        raw_text = samples[provider]
        results.append(
            OcrResult(
                provider=provider,
                label=PROVIDER_LABELS[provider],
                status="reference" if provider == "truth" else "demo",
                elapsed_ms=elapsed_by_provider[provider],
                raw_text=raw_text,
                line_count=len(raw_text.splitlines()),
                char_count=len(raw_text),
                note=PROVIDER_NOTES[provider],
            )
        )
    return results


def image_data_uri(image_path: Path | None) -> str:
    if image_path is None:
        svg = """<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560">
<rect width="900" height="560" fill="#f7fafc"/>
<rect x="210" y="70" width="480" height="420" rx="18" fill="#ffffff" stroke="#d8e2ee" stroke-width="3"/>
<text x="450" y="145" font-family="Arial" font-size="34" font-weight="700" text-anchor="middle" fill="#0b1324">OCR SAMPLE</text>
<text x="450" y="210" font-family="Arial" font-size="25" text-anchor="middle" fill="#172033">약봉지 이미지 자리</text>
<text x="450" y="260" font-family="Arial" font-size="22" text-anchor="middle" fill="#5b667a">demo mode</text>
<rect x="270" y="315" width="360" height="44" rx="10" fill="#e6f4f1"/>
<rect x="270" y="375" width="360" height="44" rx="10" fill="#edf6ff"/>
</svg>"""
        return "data:image/svg+xml;base64," + base64.b64encode(svg.encode("utf-8")).decode("ascii")
    mime_type = mimetypes.guess_type(str(image_path))[0] or "image/png"
    return f"data:{mime_type};base64,{base64.b64encode(read_bytes(image_path)).decode('ascii')}"


def status_badge(result: OcrResult) -> str:
    label = html.escape(result.status.upper())
    return f'<span class="badge badge-{html.escape(result.status)}">{label}</span>'


def render_result_card(result: OcrResult) -> str:
    escaped_text = html.escape(result.raw_text or "")
    error = ""
    if result.error:
        error = f'<div class="error">{html.escape(result.error)}</div>'
    return f"""
      <section class="card provider-{html.escape(result.provider)}">
        <header class="card-head">
          <div>
            <h2>{html.escape(result.label)}</h2>
            <p>{html.escape(result.note)}</p>
          </div>
          {status_badge(result)}
        </header>
        <div class="metrics">
          <div><strong>{result.elapsed_ms}</strong><span>ms</span></div>
          <div><strong>{result.line_count}</strong><span>lines</span></div>
          <div><strong>{result.char_count}</strong><span>chars</span></div>
        </div>
        {error}
        <pre>{escaped_text if escaped_text else "No raw text captured."}</pre>
      </section>
    """


def preview_lines(raw_text: str, max_lines: int = 14) -> str:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    return "\n".join(lines[:max_lines])


def score_result(result: OcrResult) -> tuple[int, str]:
    if result.status not in {"ok", "demo"}:
        if result.status == "reference":
            return 100, "Reference"
        return 0, "Failed"
    if result.normalized_cer is not None:
        score = max(0, min(100, round((1 - result.normalized_cer) * 100)))
        if result.keyword_hit_rate is not None:
            score = round((score * 0.7) + (result.keyword_hit_rate * 100 * 0.3))
        if score >= 85:
            label = "Good"
        elif score >= 65:
            label = "Medium"
        elif score > 0:
            label = "Low"
        else:
            label = "Poor"
        return score, label
    text = result.raw_text or ""
    korean_count = sum(1 for char in text if "\uac00" <= char <= "\ud7a3")
    digit_count = sum(1 for char in text if char.isdigit())
    line_score = min(result.line_count, 80)
    char_score = min(result.char_count // 8, 80)
    score = min(100, korean_count * 2 + digit_count // 2 + line_score // 2 + char_score // 2)
    if score >= 80:
        label = "Good"
    elif score >= 45:
        label = "Medium"
    elif score > 0:
        label = "Low"
    else:
        label = "Poor"
    return score, label

def metric_value(value: float | None, *, inverse: bool = False) -> str:
    if value is None:
        return "-"
    display = value * 100
    return f"{display:.1f}%"


def metric_class(value: float | None, good_threshold: float, bad_threshold: float, *, lower_is_better: bool) -> str:
    if value is None:
        return "neutral"
    if lower_is_better:
        if value <= good_threshold:
            return "good"
        if value >= bad_threshold:
            return "bad"
    else:
        if value >= good_threshold:
            return "good"
        if value <= bad_threshold:
            return "bad"
    return "mid"


def render_compact_column(result: OcrResult) -> str:
    raw_text = html.escape(result.raw_text or "No raw text captured.")
    return f"""
      <section class="compact-card provider-{html.escape(result.provider)}">
        <div class="compact-head">
          <h2>{html.escape(result.label)}</h2>
          {status_badge(result)}
        </div>
        <div class="metric-list">
          <div class="{metric_class(result.keyword_hit_rate, 0.85, 0.60, lower_is_better=False)}">
            <span>1. Keyword Hit Rate</span><strong>{metric_value(result.keyword_hit_rate)}</strong>
          </div>
          <div class="{metric_class(float(result.noise_count or 0), 5, 15, lower_is_better=True)}">
            <span>2. Noise Count</span><strong>{result.noise_count if result.noise_count is not None else "-"}</strong>
          </div>
          <div class="neutral">
            <span>3. Processing Time</span><strong>{result.elapsed_ms}ms</strong>
          </div>
          <div class="{metric_class(result.normalized_cer, 0.10, 0.25, lower_is_better=True)}">
            <span>4. Normalized CER</span><strong>{metric_value(result.normalized_cer)}</strong>
          </div>
        </div>
        <pre>{raw_text}</pre>
      </section>
    """

def render_html(results: list[OcrResult], image_path: Path | None, output_json_name: str) -> str:
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    max_chars = max([result.char_count for result in results] + [1])
    rows = []
    for result in results:
        width = max(4, int((result.char_count / max_chars) * 100))
        rows.append(
            f"""
            <tr>
              <td>{html.escape(result.label)}</td>
              <td>{status_badge(result)}</td>
              <td>{result.elapsed_ms} ms</td>
              <td>{result.line_count}</td>
              <td>{metric_value(result.raw_cer)}</td>
              <td>{metric_value(result.normalized_cer)}</td>
              <td>{metric_value(result.keyword_hit_rate)}</td>
              <td>{result.noise_count if result.noise_count is not None else "-"}</td>
              <td>
                <div class="bar"><span style="width:{width}%"></span></div>
                <small>{result.char_count} chars</small>
              </td>
            </tr>
            """
        )

    compact_cards = "\n".join(render_compact_column(result) for result in results)
    source_label = str(image_path) if image_path else "demo image"
    data_uri = image_data_uri(image_path)
    rows_html = "\n".join(rows)

    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Medinote OCR Raw Text Comparison</title>
  <style>
    :root {{
      --navy: #0b1324;
      --ink: #172033;
      --muted: #5b667a;
      --line: #d8e2ee;
      --light: #f7fafc;
      --mint: #00a88f;
      --mint-soft: #e6f4f1;
      --blue: #2563eb;
      --blue-soft: #edf6ff;
      --amber: #ffb020;
      --amber-soft: #fff4db;
      --red: #e5484d;
      --white: #ffffff;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--light);
      color: var(--ink);
      font-family: Arial, "Malgun Gothic", sans-serif;
    }}
    .page {{
      width: 1680px;
      margin: 0 auto;
      padding: 36px 52px 48px;
    }}
    .hero {{
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 32px;
      margin-bottom: 28px;
    }}
    .eyebrow {{
      color: var(--mint);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: .04em;
      margin-bottom: 14px;
    }}
    h1 {{
      margin: 0;
      font-size: 46px;
      line-height: 1.12;
      color: var(--navy);
    }}
    .hero p {{
      margin: 14px 0 0;
      font-size: 18px;
      color: var(--muted);
    }}
    .meta {{
      text-align: right;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
    }}
    .top-grid {{
      display: grid;
      grid-template-columns: 430px 1fr;
      gap: 24px;
      align-items: stretch;
      margin-bottom: 24px;
    }}
    .image-panel, .summary {{
      background: var(--white);
      border: 1px solid var(--line);
      border-radius: 12px;
      box-shadow: 0 10px 28px rgba(11, 19, 36, .06);
    }}
    .image-panel {{
      padding: 18px;
    }}
    .image-panel img {{
      width: 100%;
      height: 420px;
      object-fit: contain;
      background: #eef2f6;
      border-radius: 8px;
      display: block;
    }}
    .image-panel .caption {{
      margin-top: 12px;
      font-size: 13px;
      color: var(--muted);
      word-break: break-all;
    }}
    .summary {{
      padding: 24px;
    }}
    .summary h2 {{
      margin: 0 0 14px;
      font-size: 24px;
      color: var(--navy);
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 15px;
    }}
    th, td {{
      border-bottom: 1px solid var(--line);
      padding: 13px 10px;
      text-align: left;
      vertical-align: middle;
    }}
    th {{
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }}
    .bar {{
      width: 170px;
      height: 9px;
      border-radius: 999px;
      background: #edf1f5;
      overflow: hidden;
      display: inline-block;
      margin-right: 10px;
      vertical-align: middle;
    }}
    .bar span {{
      display: block;
      height: 100%;
      background: linear-gradient(90deg, var(--mint), var(--blue));
    }}
    small {{ color: var(--muted); }}
    .cards {{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 22px;
    }}
    .compact-grid {{
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }}
    .compact-card {{
      background: var(--white);
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 28px rgba(11, 19, 36, .06);
    }}
    .compact-head {{
      min-height: 82px;
      padding: 16px 18px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      background: var(--mint-soft);
      border-bottom: 1px solid var(--line);
    }}
    .provider-naver .compact-head, .provider-azure .compact-head {{
      background: var(--blue-soft);
    }}
    .provider-truth .compact-head {{
      background: var(--navy);
    }}
    .provider-truth .compact-head h2,
    .provider-truth .card-head h2 {{
      color: var(--white);
    }}
    .compact-head h2 {{
      margin: 0;
      font-size: 18px;
      line-height: 1.15;
      color: var(--navy);
    }}
    .metric-list {{
      display: grid;
      grid-template-columns: 1fr;
      border-bottom: 1px solid var(--line);
      background: var(--line);
      gap: 1px;
    }}
    .metric-list div {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 44px;
      background: var(--white);
      padding: 10px 16px;
    }}
    .metric-list span {{
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .03em;
    }}
    .metric-list strong {{
      color: var(--navy);
      font-size: 22px;
      line-height: 1;
      white-space: nowrap;
    }}
    .metric-list .good strong {{ color: var(--mint); }}
    .metric-list .mid strong {{ color: var(--amber); }}
    .metric-list .bad strong {{ color: var(--red); }}
    .compact-card pre {{
      min-height: 470px;
      max-height: 470px;
      overflow-y: scroll;
      overflow-x: auto;
      scrollbar-gutter: stable;
      padding: 16px 18px;
      font-size: 13px;
      line-height: 1.45;
    }}
    .card {{
      background: var(--white);
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 28px rgba(11, 19, 36, .06);
    }}
    .card-head {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      min-height: 104px;
      padding: 22px 24px;
      background: var(--mint-soft);
      border-bottom: 1px solid var(--line);
    }}
    .provider-naver .card-head, .provider-azure .card-head {{
      background: var(--blue-soft);
    }}
    .provider-truth .card-head {{
      background: var(--navy);
    }}
    .card h2 {{
      margin: 0;
      font-size: 24px;
      color: var(--navy);
    }}
    .card p {{
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 14px;
    }}
    .badge {{
      display: inline-block;
      min-width: 78px;
      padding: 7px 10px;
      border-radius: 999px;
      color: var(--white);
      background: var(--muted);
      font-size: 12px;
      font-weight: 800;
      text-align: center;
    }}
    .badge-ok, .badge-demo {{ background: var(--mint); }}
    .badge-reference {{ background: var(--navy); }}
    .badge-empty {{ background: var(--amber); }}
    .badge-error {{ background: var(--red); }}
    .badge-skipped {{ background: var(--muted); }}
    .metrics {{
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1px;
      background: var(--line);
      border-bottom: 1px solid var(--line);
    }}
    .metrics div {{
      background: var(--white);
      padding: 16px 22px;
    }}
    .metrics strong {{
      display: block;
      color: var(--navy);
      font-size: 26px;
      line-height: 1;
    }}
    .metrics span {{
      display: block;
      margin-top: 6px;
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .05em;
    }}
    .error {{
      margin: 18px 22px 0;
      padding: 12px 14px;
      border-radius: 8px;
      background: #fff0f0;
      color: #9f1d22;
      font-size: 13px;
      line-height: 1.45;
    }}
    pre {{
      margin: 0;
      padding: 22px;
      min-height: 310px;
      max-height: 430px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: "Cascadia Mono", Consolas, monospace;
      font-size: 15px;
      line-height: 1.55;
      color: var(--ink);
      background: #fbfcfe;
    }}
    .footnote {{
      margin-top: 28px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
    }}
    @media print {{
      .page {{ width: auto; padding: 24px; }}
      pre {{ max-height: none; }}
    }}
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div>
        <div class="eyebrow">MEDINOTE OCR MODEL TEST</div>
        <h1>Raw Text Comparison Report</h1>
        <p>OCR 모델 자체의 raw text 품질만 비교하고, 약명/메타데이터 추출 로직은 분리합니다.</p>
      </div>
      <div class="meta">
        Generated: {html.escape(generated_at)}<br>
        JSON: {html.escape(output_json_name)}
      </div>
    </section>

    <section class="top-grid">
      <aside class="image-panel">
        <img src="{data_uri}" alt="OCR input image">
        <div class="caption">{html.escape(source_label)}</div>
      </aside>
      <section class="summary">
        <h2>Comparison Snapshot</h2>
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Status</th>
              <th>Time</th>
              <th>Lines</th>
              <th>전체 오답률</th>
              <th>정규화 오답률</th>
              <th>키워드 적중률</th>
              <th>노이즈 개수</th>
              <th>Raw Text Volume</th>
            </tr>
          </thead>
          <tbody>
            {rows_html}
          </tbody>
        </table>
      </section>
    </section>

    <section class="compact-grid">
      {compact_cards}
    </section>

    <p class="footnote">
      Evaluation scope: Korean raw text readability, line break/layout preservation,
      small text stability, numbers/brackets/special characters, elapsed time, cost and privacy implications.
      Excluded: medication candidate extraction, pharmacy/hospital/date extraction, DB matching.
    </p>
  </main>
</body>
</html>
"""


def write_outputs(
    results: list[OcrResult],
    image_path: Path | None,
    out_dir: Path,
    truth_path: Path | None = None,
    keywords_path: Path | None = None,
) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = out_dir / f"ocr_compare_{timestamp}.json"
    html_path = out_dir / f"ocr_compare_{timestamp}.html"

    payload = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "image": str(image_path) if image_path else None,
        "scope": "raw OCR text comparison only",
        "truth": str(truth_path) if truth_path else None,
        "keywords": str(keywords_path) if keywords_path else None,
        "results": [asdict(result) for result in results],
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    html_path.write_text(render_html(results, image_path, json_path.name), encoding="utf-8")
    return html_path, json_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a Medinote OCR raw text comparison HTML report.")
    parser.add_argument("--image", type=Path, help="Input prescription or medicine-bag image.")
    parser.add_argument("--out", type=Path, default=Path("outputs/ocr-compare"), help="Output directory.")
    parser.add_argument(
        "--providers",
        nargs="+",
        choices=sorted(PROVIDER_LABELS),
        default=["google", "naver", "azure", "truth"],
        help="OCR providers to run.",
    )
    parser.add_argument("--demo", action="store_true", help="Generate a visual demo report without calling OCR APIs.")
    parser.add_argument("--truth", type=Path, help="Ground-truth text file for Raw CER and Normalized CER.")
    parser.add_argument("--keywords", type=Path, help="Keyword list text file for Keyword Hit Rate. One keyword per line.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.truth and "truth" not in args.providers:
        args.providers.append("truth")

    if args.demo:
        results = demo_results(args.providers)
        image_path = None
    else:
        if not args.image:
            print("--image is required unless --demo is used.", file=sys.stderr)
            return 2
        image_path = args.image.resolve()
        if not image_path.exists():
            print(f"Image not found: {image_path}", file=sys.stderr)
            return 2

        runners = {
            "google": google_ocr,
            "naver": naver_ocr,
            "azure": azure_ocr,
        }
        results = [
            runners[provider](image_path)
            for provider in args.providers
            if provider != "truth"
        ]

    truth_text = None
    truth_path = None
    if args.truth:
        truth_path = args.truth.resolve()
        if not truth_path.exists():
            print(f"Truth file not found: {truth_path}", file=sys.stderr)
            return 2
        truth_text = truth_path.read_text(encoding="utf-8-sig")

    keywords: list[str] = []
    keywords_path = None
    if args.keywords:
        keywords_path = args.keywords.resolve()
        if not keywords_path.exists():
            print(f"Keywords file not found: {keywords_path}", file=sys.stderr)
            return 2
        keywords = [
            line.strip()
            for line in keywords_path.read_text(encoding="utf-8-sig").splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]

    apply_metrics(results, truth_text, keywords)
    if "truth" in args.providers:
        reference = truth_result(truth_text)
        apply_metrics([reference], truth_text, keywords)
        results.append(reference)

    html_path, json_path = write_outputs(results, image_path, args.out.resolve(), truth_path, keywords_path)
    print(f"HTML report: {html_path}")
    print(f"JSON results: {json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())






