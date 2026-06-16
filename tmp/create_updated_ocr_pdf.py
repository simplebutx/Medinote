from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
)


ROOT = Path(r"C:\dev\project")
OUT_DIR = Path(r"C:\Users\user\Downloads")
PDF_OUT = OUT_DIR / "OCR_복약_일정_생성_수정본_2026-06-15.pdf"
MD_OUT = ROOT / "tmp" / "OCR_복약_일정_생성_수정본_2026-06-15.md"

FONT = "NanumGothic"
FONT_BOLD = "NanumGothicBold"
pdfmetrics.registerFont(TTFont(FONT, r"C:\Windows\Fonts\NanumGothic.ttf"))
pdfmetrics.registerFont(TTFont(FONT_BOLD, r"C:\Windows\Fonts\NanumGothicBold.ttf"))


def md_escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def make_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="KTitle",
            parent=styles["Title"],
            fontName=FONT_BOLD,
            fontSize=24,
            leading=32,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#1f3b5f"),
            spaceAfter=18,
        )
    )
    styles.add(
        ParagraphStyle(
            name="KHeading",
            parent=styles["Heading1"],
            fontName=FONT_BOLD,
            fontSize=15,
            leading=20,
            textColor=colors.HexColor("#1f3b5f"),
            spaceBefore=12,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="KSubHeading",
            parent=styles["Heading2"],
            fontName=FONT_BOLD,
            fontSize=12,
            leading=17,
            textColor=colors.HexColor("#334155"),
            spaceBefore=8,
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            name="KBody",
            parent=styles["BodyText"],
            fontName=FONT,
            fontSize=10,
            leading=15,
            wordWrap="CJK",
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            name="KBullet",
            parent=styles["BodyText"],
            fontName=FONT,
            fontSize=9.6,
            leading=14,
            leftIndent=12,
            firstLineIndent=-8,
            wordWrap="CJK",
            spaceAfter=3,
        )
    )
    styles.add(
        ParagraphStyle(
            name="KCode",
            parent=styles["Code"],
            fontName=FONT,
            fontSize=8.5,
            leading=12,
            leftIndent=6,
            rightIndent=6,
            backColor=colors.HexColor("#f5f7fa"),
            borderColor=colors.HexColor("#d8dee8"),
            borderWidth=0.5,
            borderPadding=6,
            wordWrap="CJK",
            spaceBefore=4,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="KSmall",
            parent=styles["BodyText"],
            fontName=FONT,
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#64748b"),
            wordWrap="CJK",
        )
    )
    return styles


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT, 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(18 * mm, 12 * mm, "OCR 복약 일정 생성")
    canvas.drawRightString(192 * mm, 12 * mm, str(doc.page))
    canvas.setStrokeColor(colors.HexColor("#d8dee8"))
    canvas.line(18 * mm, 18 * mm, 192 * mm, 18 * mm)
    canvas.restoreState()


def p(story, styles, text):
    story.append(Paragraph(md_escape(text), styles["KBody"]))


def h(story, styles, text):
    story.append(Paragraph(md_escape(text), styles["KHeading"]))


def sh(story, styles, text):
    story.append(Paragraph(md_escape(text), styles["KSubHeading"]))


def b(story, styles, text):
    story.append(Paragraph("• " + md_escape(text), styles["KBullet"]))


def code(story, styles, text):
    story.append(Preformatted(text, styles["KCode"]))


def build_story():
    styles = make_styles()
    story = []

    story.append(Paragraph("OCR 복약 일정 생성", styles["KTitle"]))
    p(story, styles, "2026-06-15 기준 수정본")
    p(story, styles, "오늘 변경된 OCR 파이프라인 기준으로 이미지 품질 점수화, 회전 OCR 재시도, OCR confidence 요약, 약 목록 3종 파서, DB 약명 Top-3 매칭 흐름을 반영했다.")
    story.append(Spacer(1, 8))

    h(story, styles, "1. 전체 처리 흐름")
    code(
        story,
        styles,
        """사용자가 약봉지/처방전 이미지 업로드
↓
Spring Boot가 업로드용 presigned URL 발급
↓
ocr_result 캐시 row 생성 (status=PRESIGNED_ISSUED)
↓
앱이 presigned URL로 S3에 이미지 업로드
↓
Spring Boot가 ocrResultId, userId, imageKey를 FastAPI에 전달
↓
FastAPI가 S3에서 이미지 로드
↓
이미지 품질 점수화 + 이미지 전처리
↓
Google Vision OCR 실행
↓
OCR 결과가 부족하면 90/180/270도 회전 후 재시도
↓
OCR 토큰을 줄 단위 텍스트로 변환
↓
메타데이터 추출 + 약 목록 추출
↓
Spring Boot에서 DB 약품명 Top-3 후보 매칭
↓
사용자 확인 화면 제공
↓
사용자가 수정/확정
↓
복약 일정 저장 및 알림 생성""",
    )

    h(story, styles, "2. 촬영부터 S3 저장까지")
    b(story, styles, "사용자가 앱에서 약봉지 또는 처방전 이미지를 선택한다.")
    b(story, styles, "Spring Boot가 presigned URL을 발급하고 OCR 결과 캐시를 생성한다.")
    b(story, styles, "앱은 presigned URL을 통해 S3에 이미지를 업로드한다.")
    b(story, styles, "Spring Boot는 저장된 imageKey를 기준으로 FastAPI OCR 분석을 요청한다.")
    code(
        story,
        styles,
        """{
  "ocrResultId": 123,
  "userId": 45,
  "imageKey": "prescriptions/45/2026/06/15/sample.png"
}""",
    )

    h(story, styles, "3. 이미지 품질 점수화와 전처리")
    p(story, styles, "FastAPI는 S3에서 이미지를 불러온 뒤 OCR 전에 이미지 상태를 점검한다. 이 값은 OCR 실패 원인 파악과 추후 재촬영 UX에 활용할 수 있다.")
    b(story, styles, "흐림 정도")
    b(story, styles, "밝기와 대비")
    b(story, styles, "글자 영역과 이미지 크기")
    b(story, styles, "OCR에 적합한 기본 품질")
    p(story, styles, "이후 명암 보정, 노이즈 완화, 글자 대비 강화, 기울기 보정, 문서 영역 보정 등을 시도한다.")
    p(story, styles, "이전 문서에 있던 preprocessedImageDataUrl 반환은 현재 사용하지 않으므로 제거된 흐름으로 정리한다.")

    h(story, styles, "4. OCR 실행과 회전 재시도")
    p(story, styles, "OCR 엔진은 Google Vision document_text_detection을 사용한다. OCR은 텍스트뿐 아니라 단어의 좌표와 confidence도 함께 반환한다.")
    code(
        story,
        styles,
        """1차 OCR 실행
→ token 수, 주요 키워드, confidence 기반으로 OCR 품질 점수 계산
→ 결과가 충분하면 그대로 사용
→ 부족하면 90/180/270도 회전 이미지로 OCR 재시도
→ 가장 점수가 높은 OCR 결과 선택""",
    )
    p(story, styles, "최종 resultJson에는 선택된 회전 정보가 ocrOrientation으로 포함된다.")
    code(
        story,
        styles,
        """"ocrOrientation": {
  "rotation": 0,
  "score": 142,
  "triedRotations": "0"
}""",
    )

    h(story, styles, "5. OCR 토큰과 줄 단위 텍스트")
    p(story, styles, "Google Vision 결과는 단순 문자열이 아니라 text, bounding box 좌표, confidence를 가진 OCR 토큰이다. FastAPI는 y좌표가 가까운 토큰끼리 묶고 x좌표 순서로 정렬해 줄 단위 텍스트를 만든다.")
    code(
        story,
        styles,
        """OCR Token
→ y좌표 기준 row clustering
→ row 내부 x좌표 정렬
→ line text 생성
→ metadata_extractor / medicine_extractor에 전달""",
    )

    h(story, styles, "6. FastAPI 구조화 결과")
    p(story, styles, "FastAPI는 OCR 결과를 구조화해 resultJson 문자열로 반환한다. 현재 포함되는 주요 필드는 다음과 같다.")
    code(
        story,
        styles,
        """{
  "ocrResultId": 123,
  "userId": 45,
  "imageKey": "prescriptions/45/2026/06/15/sample.png",
  "imageQuality": {
    "...": "이미지 품질 요약"
  },
  "ocrOrientation": {
    "rotation": 0,
    "score": 142,
    "triedRotations": "0"
  },
  "ocrConfidence": {
    "tokenCount": 180,
    "avg": 0.91,
    "min": 0.62,
    "lowCount": 8
  },
  "dispensedDate": "2026-06-15",
  "hospitalName": "OO내과",
  "pharmacyName": "OO약국",
  "medicines": [
    {
      "name": "세토펜8시간이알서방정",
      "dosage": "1",
      "frequency": "3",
      "days": "4"
    }
  ]
}""",
    )

    h(story, styles, "7. 메타데이터 추출")
    p(story, styles, "metadata_extractor는 조제일자, 병원명, 약국명을 추출한다. 기본 전략은 라벨 기반 추출이고, 실패하면 전체 줄 텍스트에서 fallback으로 찾는다.")
    b(story, styles, "날짜: 조제일자, 조제 일자, 발행일 등 라벨 근처에서 우선 추출하고 YYYY-MM-DD로 정규화")
    b(story, styles, "약국명: 상호, 약국명, 발행기관 등 라벨 근처 또는 '...약국' 패턴에서 추출")
    b(story, styles, "병원명: 병원정보, 병원, 의원, 치과, 내과 등 접미사를 기준으로 추출")

    h(story, styles, "8. 약 목록 추출 방식")
    p(story, styles, "약봉지는 약국마다 형식이 달라 하나의 정규식만으로 처리하기 어렵다. 현재는 세 가지 파서를 실행한 뒤 후보 점수화를 통해 최종 약 목록을 선택한다.")
    sh(story, styles, "8-1. 큰표 복약안내형")
    p(story, styles, "복약안내 문장 안에서 약명과 복약량을 같은 줄에서 찾는 방식이다.")
    code(story, styles, "세토펜8시간이알서방정 1정씩 3회 4일분\n토브라점안액 1방울씩 3회\n후시딘연고 1일 1~2회")
    sh(story, styles, "8-2. 큰표 대괄호 설명형")
    p(story, styles, "약품명 뒤에 효능/분류 설명이 대괄호로 붙는 양식을 보조적으로 처리한다.")
    code(story, styles, "액시드캡슐150mg [위산억제제] 1캡슐씩 2회 7일분")
    sh(story, styles, "8-3. 작은표 요약형")
    p(story, styles, "약품명 / 투약량 / 횟수 / 일수 헤더를 찾고, 그 아래 행을 약 목록으로 읽는다.")
    code(story, styles, "약품명        투약량   횟수   일수\n지르텍정      1       1      4\n넥시움정      1       1      4")
    p(story, styles, "이전 문서에 있던 aligned_columns, standalone_lines 중심 설명은 현재 핵심 흐름에서 제외했다. 현재 메인 파서는 administration_lines, guide_lines, summary_lines다.")

    h(story, styles, "9. 공통 스케줄 보정")
    p(story, styles, "약별 줄에서 일부 값이 누락될 수 있으므로 문서 전체에서 공통 복약 스케줄을 별도로 찾는다.")
    code(story, styles, "1일 3회 5일분\n아침 · 점심 · 저녁 / 식후 30분")
    p(story, styles, "각 약에서 frequency나 days가 비어 있으면 공통 스케줄로 채운다. 단, 필요 시 복용 약은 정해진 횟수와 일수를 자동으로 넣지 않는다.")

    h(story, styles, "10. 후보 점수화와 최종 선택")
    p(story, styles, "세 파서 결과를 모두 후보로 두고 약명 품질과 복약 정보 완성도를 기준으로 점수화한다.")
    b(story, styles, "약명이 실제 약품명처럼 보이는지")
    b(story, styles, "dosage, frequency, days가 얼마나 완성되어 있는지")
    b(story, styles, "영수증, 금액, 병원명, 주의사항 같은 잡음이 섞이지 않았는지")
    b(story, styles, "지나치게 긴 설명문이 약명으로 들어오지 않았는지")
    p(story, styles, "가장 점수가 높은 후보군을 선택하고, 다른 파서에서만 잡힌 약이 있으면 병합한 뒤 최종 정리한다.")

    h(story, styles, "11. Spring Boot 후처리와 DB 약명 매칭")
    p(story, styles, "FastAPI가 반환한 OCR 약명은 그대로 확정하지 않고, Spring Boot에서 DB 약품명과 다시 매칭한다.")
    code(
        story,
        styles,
        """OCR 약명 정규화
→ DB 약품명 전체 조회
→ 정확 일치 / 함량 제거 후 일치 / 포함 관계 / 편집거리 비교
→ 점수 높은 순으로 Top-3 후보 반환
→ 점수에 따라 자동 매칭 또는 사용자 확인 상태 부여""",
    )
    p(story, styles, "현재 매칭 결과는 각 medicine 객체에 다음 필드로 추가된다.")
    code(
        story,
        styles,
        """"originalName": "세토 펜 8 시간 이 알 서방정",
"matchedName": "세토펜8시간이알서방정",
"matchScore": 0.94,
"matchStatus": "AUTO_MATCHED",
"matchCandidates": [
  {
    "name": "세토펜8시간이알서방정",
    "score": 0.94,
    "reason": "exact_without_strength"
  }
]""",
    )
    p(story, styles, "matchStatus는 NO_INPUT, NO_MATCH, LOW_CONFIDENCE, NEEDS_CONFIRMATION, AUTO_MATCHED로 구분한다.")

    h(story, styles, "12. 사용자 확인 및 저장")
    b(story, styles, "OCR 결과와 DB 매칭 결과를 사용자에게 보여준다.")
    b(story, styles, "사용자는 약품명, 투약량, 횟수, 일수, 복용 시간대를 수정할 수 있다.")
    b(story, styles, "사용자가 확정하면 복약 일정이 저장되고 알림 생성으로 이어진다.")
    p(story, styles, "OCR은 자동 입력을 돕는 역할이며, 약품명과 복약 정보의 최종 확정은 사용자 확인을 거친다.")

    h(story, styles, "13. OCR 모델 후보와 선택 이유")
    p(story, styles, "OCR 모델 비교에서는 EasyOCR, PaddleOCR, NAVER CLOVA OCR, Tesseract OCR, Google Vision OCR을 비교 후보로 둘 수 있다. 현재 구현은 Google Vision document_text_detection을 사용한다.")
    b(story, styles, "문서 단위 OCR에 적합하고 좌표 정보를 함께 제공한다.")
    b(story, styles, "word/symbol confidence를 활용해 OCR 품질 요약이 가능하다.")
    b(story, styles, "FastAPI 서버에서 API 호출 방식으로 연동하기 쉽다.")
    b(story, styles, "한국어 약봉지 샘플 테스트에서 raw text 품질이 비교적 안정적이었다.")

    h(story, styles, "14. 현재 한계와 개선 방향")
    b(story, styles, "약봉지 형식이 매우 다양해 100% 자동 추출은 어렵다.")
    b(story, styles, "문서 네 꼭짓점 기반 원근 보정과 더 정교한 table reconstruction은 추후 개선 대상이다.")
    b(story, styles, "confidence가 낮은 영역을 사용자 확인 대상으로 표시하면 안전성을 높일 수 있다.")
    b(story, styles, "사용자가 수정한 결과를 저장해 향후 약명 매칭 사전과 보정 규칙을 개선할 수 있다.")
    b(story, styles, "실제 서비스 수준에서는 더 많은 실제 약봉지 샘플 기반 검증이 필요하다.")

    h(story, styles, "15. 발표용 요약")
    p(story, styles, "약봉지는 약국마다 양식이 달라 단순 OCR만으로는 안정적인 구조화가 어렵다. 그래서 이미지 품질 점수화와 전처리 후 OCR을 수행하고, 결과가 부족하면 회전 이미지로 OCR을 재시도했다. 이후 OCR 토큰을 줄 단위 텍스트로 변환하고, 큰표 복약안내형, 대괄호 설명형, 작은표 요약형 파서를 각각 실행했다. 최종 약 목록은 후보 점수화와 공통 스케줄 보정으로 선택하며, OCR 약명은 DB 약품명과 유사도 기반 Top-3 매칭을 수행한다. 마지막으로 사용자가 확인 후 복약 일정으로 등록하도록 설계했다.")

    return story


def build_markdown():
    return """# OCR 복약 일정 생성 수정본 (2026-06-15)

## 전체 처리 흐름

이미지 업로드 → presigned URL 발급 → S3 업로드 → FastAPI OCR 요청 → 이미지 품질 점수화/전처리 → Google Vision OCR → 필요 시 회전 재시도 → 줄 단위 텍스트 변환 → 메타데이터/약 목록 추출 → DB 약품명 Top-3 매칭 → 사용자 확인 → 복약 일정 저장 및 알림 생성

## 오늘 기준 핵심 변경

- `preprocessedImageDataUrl` 반환 흐름 제거
- `ocrTemplate` 유형 분류 제거
- OCR 결과에 `imageQuality`, `ocrOrientation`, `ocrConfidence` 포함
- 약 목록 파서는 `administration_lines`, `guide_lines`, `summary_lines` 중심
- DB 약명 매칭은 `matchedName`, `matchScore`, `matchStatus`, `matchCandidates` 반환
- 최종 확정은 사용자 확인 UX에서 처리
"""


def main():
    doc = BaseDocTemplate(
        str(PDF_OUT),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=22 * mm,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="ocr", frames=[frame], onPage=header_footer)])
    doc.build(build_story())
    MD_OUT.write_text(build_markdown(), encoding="utf-8")
    print(PDF_OUT)
    print(MD_OUT)


if __name__ == "__main__":
    main()
