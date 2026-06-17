from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(r"C:\dev\project")
OUT_DIR = ROOT / "output" / "pdf"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PDF_OUT = OUT_DIR / "hong_gildong_demo_prescription_2026-06-17.pdf"

FONT = "NanumGothic"
FONT_BOLD = "NanumGothicBold"
pdfmetrics.registerFont(TTFont(FONT, r"C:\Windows\Fonts\NanumGothic.ttf"))
pdfmetrics.registerFont(TTFont(FONT_BOLD, r"C:\Windows\Fonts\NanumGothicBold.ttf"))


def esc(text):
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=base["Title"],
            fontName=FONT_BOLD,
            fontSize=22,
            leading=28,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#111827"),
            spaceAfter=8,
        ),
        "section": ParagraphStyle(
            "section",
            parent=base["Heading2"],
            fontName=FONT_BOLD,
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=8,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontName=FONT,
            fontSize=9.5,
            leading=13.5,
            wordWrap="CJK",
            textColor=colors.HexColor("#1f2937"),
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["BodyText"],
            fontName=FONT,
            fontSize=8,
            leading=11,
            wordWrap="CJK",
            textColor=colors.HexColor("#475569"),
        ),
        "badge": ParagraphStyle(
            "badge",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=8,
            leading=10,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#0f172a"),
        ),
        "left_head": ParagraphStyle(
            "left_head",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=9,
            leading=12,
            alignment=TA_LEFT,
            wordWrap="CJK",
        ),
    }


S = styles()


def p(text, style="body"):
    return Paragraph(esc(text), S[style])


def badge(text):
    return Paragraph(esc(text), S["badge"])


def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT, 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(18 * mm, 12 * mm, "Medinote 데모 처방전")
    canvas.drawRightString(192 * mm, 12 * mm, f"{doc.page}")
    canvas.setStrokeColor(colors.HexColor("#dbe3ef"))
    canvas.line(18 * mm, 18 * mm, 192 * mm, 18 * mm)
    canvas.restoreState()


def info_table():
    data = [
        [p("처방전 번호", "left_head"), p("MDN-20260617-001"), p("처방일", "left_head"), p("2026-06-17")],
        [p("환자명", "left_head"), p("홍길동"), p("생년월일 / 성별", "left_head"), p("1990-03-15 / 남")],
        [p("이메일", "left_head"), p("hong.gildong@naver-care.com"), p("처방 기간", "left_head"), p("2026-06-17 ~ 2026-06-23, 총 7일")],
        [p("의료기관", "left_head"), p("메디노트 내과의원"), p("조제 약국", "left_head"), p("네이버케어 약국")],
    ]
    table = Table(data, colWidths=[28 * mm, 67 * mm, 30 * mm, 57 * mm])
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eff6ff")),
                ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#eff6ff")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def medicine_table():
    data = [
        [p("번호", "left_head"), p("약품명", "left_head"), p("성분명", "left_head"), p("1회량", "left_head"), p("횟수", "left_head"), p("일수", "left_head"), p("복용 시간", "left_head"), p("복약 안내", "left_head")],
        [p("1"), p("게보린정(수출명:돌로린정)"), p("아세트아미노펜 / 이소프로필안티피린 / 카페인무수물"), p("1정"), p("1일 3회"), p("3일"), p("08:00, 13:00, 20:00"), p("두통 또는 발열 시 식후 복용")],
        [p("2"), p("부루펜정200밀리그램(이부프로펜)"), p("이부프로펜"), p("1정"), p("1일 3회"), p("3일"), p("08:00, 13:00, 20:00"), p("위장장애 예방을 위해 식후 복용")],
        [p("3"), p("다이아벡스정500밀리그램(메트포르민염산염)"), p("메트포르민염산염"), p("1정"), p("1일 2회"), p("7일"), p("08:00, 20:00"), p("아침/저녁 식사 직후 복용")],
        [p("4"), p("지르텍정(세티리진염산염)"), p("세티리진염산염"), p("1정"), p("1일 1회"), p("7일"), p("22:00"), p("졸음 가능, 취침 전 복용 권장")],
    ]
    table = Table(data, repeatRows=1, colWidths=[9 * mm, 40 * mm, 39 * mm, 13 * mm, 18 * mm, 12 * mm, 31 * mm, 24 * mm])
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.55, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d4ed8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#ffffff")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def badge_table(items, bg="#f8fafc", border="#cbd5e1"):
    cells = [[badge(item) for item in items[:4]]]
    if len(items) > 4:
        cells.append([badge(item) for item in items[4:8]])
    table = Table(cells, colWidths=[42 * mm] * 4)
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor(border)),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def report_table():
    rows = [
        [p("분류", "left_head"), p("감지 내용", "left_head"), p("근거", "left_head")],
        [p("주의 약"), p("게보린정"), p("사용자 등록 주의 약과 처방 약명이 일치")],
        [p("주의 성분"), p("아세트아미노펜, 이부프로펜, 세티리진염산염"), p("등록된 못 먹는 성분/주의 성분이 처방 성분과 일치")],
        [p("건강 상태"), p("흡연, 음주"), p("일반 주의 태그 중 음주 주의, 졸음 주의, 운전 주의 표시")],
        [p("기저질환"), p("만성 신장질환, 간질환, 위염, 고혈압, 당뇨병"), p("신장기능 주의, 간기능 주의, 위장장애 주의 및 복약 상담 안내")],
    ]
    table = Table(rows, colWidths=[31 * mm, 60 * mm, 91 * mm])
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.55, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def build():
    doc = SimpleDocTemplate(
        str(PDF_OUT),
        pagesize=A4,
        rightMargin=14 * mm,
        leftMargin=14 * mm,
        topMargin=15 * mm,
        bottomMargin=20 * mm,
        title="Medinote 홍길동 데모 처방전",
    )

    story = []
    story.append(Paragraph("처방전", S["title"]))
    story.append(p("OCR 자동 분석 및 복약 일정 생성 데모용 / 실제 진료용 문서가 아닙니다.", "small"))
    story.append(Spacer(1, 5 * mm))
    story.append(info_table())
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("처방 약품", S["section"]))
    story.append(medicine_table())
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("OCR 인식용 핵심 텍스트", S["section"]))
    story.append(p("복약 시작일: 2026-06-17 / 복약 종료일: 2026-06-23 / 자동 생성 일정: 아침 08:00, 점심 13:00, 저녁 20:00, 취침 전 22:00"))
    story.append(p("복약 체크 화면에서는 날짜별 약 목록을 확인하고, 복용 완료 버튼으로 완료/미완료 상태를 기록합니다. 알림은 각 복용 시간 10분 전에 발송됩니다."))
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("조제 및 복약 지도", S["section"]))
    story.append(p("게보린정과 부루펜정은 같은 날 함께 복용 시 위장장애와 간/신장 기능 관련 주의 안내가 필요합니다. 다이아벡스정은 식사 직후 규칙적으로 복용하고, 지르텍정은 졸음이 있을 수 있어 운전 전 복용에 주의합니다."))
    story.append(p("카페인, 아세트아미노펜, 이부프로펜, 세티리진염산염 성분에 대한 사용자 맞춤 주의 배지가 표시될 수 있습니다."))
    story.append(PageBreak())

    story.append(Paragraph("Medinote 분석 리포트 데모 요약", S["title"]))
    story.append(p("이 페이지는 녹화 설명용 예상 리포트입니다. 앱에서는 OCR 처방전 분석 후 사용자 건강정보와 주의 성분을 기준으로 같은 맥락의 배지를 표시합니다.", "small"))
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("사용자 건강정보 배지", S["section"]))
    story.append(badge_table(["흡연", "음주", "만성 신장질환", "간질환", "위염", "고혈압", "당뇨병"], bg="#fff7ed", border="#fed7aa"))
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("등록된 못 먹는 약/주의 성분", S["section"]))
    story.append(badge_table(["게보린정", "아세트아미노펜", "이부프로펜", "세티리진염산염"], bg="#fef2f2", border="#fecaca"))
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("처방전 분석 리포트", S["section"]))
    story.append(report_table())
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("녹화 흐름", S["section"]))
    flow = [
        ["1", p("OCR 처방전 자동 분석", "left_head"), p("첫 페이지 처방전을 업로드하여 약명, 복용량, 복용 시간, 복용 기간을 추출")],
        ["2", p("자동 복약 일정 생성", "left_head"), p("2026-06-17부터 7일간 날짜별 복약 일정 생성")],
        ["3", p("달력/날짜별 일정 확인", "left_head"), p("6월 17일, 18일, 19일 등 날짜를 눌러 약 목록과 완료율 확인")],
        ["4", p("복약 체크 및 알림", "left_head"), p("복용 완료 체크 후 상태 변경, 08:00/13:00/20:00/22:00 알림 설명")],
        ["5", p("맞춤형 약 검색", "left_head"), p("약 검색 시 등록된 건강정보와 주의 성분 기준으로 주의 배지 표시")],
    ]
    flow_table = Table(flow, colWidths=[12 * mm, 49 * mm, 121 * mm])
    flow_table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eff6ff")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.append(flow_table)
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)


def draw_text(c, x, y, text, size=11, bold=False, color="#111827", align="left", max_width=None, leading=None):
    font = FONT_BOLD if bold else FONT
    c.setFont(font, size)
    c.setFillColor(colors.HexColor(color))
    if max_width:
        words = str(text).split(" ")
        lines = []
        current = ""
        for word in words:
            trial = word if not current else current + " " + word
            if c.stringWidth(trial, font, size) <= max_width:
                current = trial
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        line_height = leading or size * 1.28
        for idx, line in enumerate(lines):
            yy = y - idx * line_height
            if align == "center":
                c.drawCentredString(x, yy, line)
            elif align == "right":
                c.drawRightString(x, yy, line)
            else:
                c.drawString(x, yy, line)
        return len(lines) * line_height
    if align == "center":
        c.drawCentredString(x, y, str(text))
    elif align == "right":
        c.drawRightString(x, y, str(text))
    else:
        c.drawString(x, y, str(text))
    return size


def draw_wrapped(c, x, y, text, width, size=11, bold=False, color="#111827", leading=None):
    font = FONT_BOLD if bold else FONT
    leading = leading or size * 1.32
    c.setFont(font, size)
    c.setFillColor(colors.HexColor(color))
    lines = []
    current = ""
    for ch in str(text):
        trial = current + ch
        if c.stringWidth(trial, font, size) <= width:
            current = trial
        else:
            lines.append(current)
            current = ch
    if current:
        lines.append(current)
    for idx, line in enumerate(lines):
        c.drawString(x, y - idx * leading, line)
    return len(lines) * leading


def draw_checkbox(c, x, y, label, checked=False):
    c.setStrokeColor(colors.HexColor("#374151"))
    c.setLineWidth(1.1)
    c.rect(x, y - 5, 5, 5)
    if checked:
        c.setLineWidth(1.4)
        c.line(x + 1, y - 2.5, x + 2.2, y - 4)
        c.line(x + 2.2, y - 4, x + 4.5, y - 0.5)
    draw_text(c, x + 7, y - 4, label, 11, bold=True)


def draw_pill(c, x, y, w=22, h=9, left="#facc15", right="#111827"):
    c.setStrokeColor(colors.HexColor("#6b7280"))
    c.setLineWidth(0.8)
    c.setFillColor(colors.HexColor(left))
    c.roundRect(x, y, w, h, h / 2, fill=1, stroke=1)
    c.saveState()
    pth = c.beginPath()
    pth.rect(x, y, w / 2, h)
    c.clipPath(pth, stroke=0)
    c.setFillColor(colors.HexColor(right))
    c.roundRect(x, y, w, h, h / 2, fill=1, stroke=0)
    c.restoreState()
    c.line(x + w / 2, y + 1, x + w / 2, y + h - 1)


def draw_tag_box(c, x, y, code, label):
    c.setStrokeColor(colors.HexColor("#374151"))
    c.setLineWidth(1.1)
    c.rect(x, y, 13, 13)
    draw_text(c, x + 6.5, y + 3.2, code, 11, bold=True, align="center")
    draw_text(c, x + 6.5, y - 6.5, label, 8.5, align="center")


def draw_qr(c, x, y, size=27):
    c.setFillColor(colors.HexColor("#4b5563"))
    cell = size / 9
    pattern = [
        "111111111",
        "100010001",
        "101110101",
        "100010001",
        "111111111",
        "101001101",
        "111010111",
        "100110001",
        "111111111",
    ]
    for row, line in enumerate(pattern):
        for col, value in enumerate(line):
            if value == "1":
                c.rect(x + col * cell, y + (8 - row) * cell, cell * 0.7, cell * 0.7, fill=1, stroke=0)


def draw_receipt_page(c):
    width, height = landscape(A4)
    c.setFillColor(colors.HexColor("#fffefa"))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    margin = 10 * mm
    c.setStrokeColor(colors.HexColor("#808080"))
    c.setLineWidth(1.2)
    c.rect(margin, margin, width - 2 * margin, height - 2 * margin, fill=0, stroke=1)

    split_x = 96 * mm
    c.setDash(3, 3)
    c.line(split_x, margin, split_x, height - margin)
    c.setDash()

    left_x = margin + 5 * mm
    right_x = split_x + 8 * mm
    top_y = height - margin - 12 * mm

    c.setFillColor(colors.HexColor("#4f6f98"))
    c.rect(left_x, top_y - 8 * mm, 75 * mm, 10 * mm, fill=1, stroke=0)
    draw_text(c, left_x + 37.5 * mm, top_y - 5.3 * mm, "약제비 계산서 · 영수증", 15, bold=True, color="#ffffff", align="center")

    receipt_rows = [
        ("영수증번호", "20260617-00031"),
        ("환자성명", "홍길동"),
        ("조제일자", "2026-06-17"),
        ("투약일수", "7  □야간  □공휴"),
        ("약제비총액", "18,700 원"),
        ("본인부담금", "5,610 원"),
        ("보험자부담금", "13,090 원"),
        ("조제기관", "약국"),
        ("발행일", "2026-06-17"),
    ]
    table_y = top_y - 12 * mm
    row_h = 7.5 * mm
    c.setLineWidth(0.7)
    for i, (k, v) in enumerate(receipt_rows):
        y = table_y - i * row_h
        c.setFillColor(colors.HexColor("#e8eef6"))
        c.rect(left_x, y - row_h, 28 * mm, row_h, fill=1, stroke=1)
        c.setFillColor(colors.HexColor("#f8fbff"))
        c.rect(left_x + 28 * mm, y - row_h, 47 * mm, row_h, fill=1, stroke=1)
        draw_text(c, left_x + 14 * mm, y - 5.1 * mm, k, 9.5, bold=True, align="center")
        draw_text(c, left_x + 29.5 * mm, y - 5.1 * mm, v, 9.5)

    c.setDash(3, 3)
    c.line(left_x, 92 * mm, split_x - 5 * mm, 92 * mm)
    c.setDash()
    draw_text(c, left_x, 83 * mm, "복약 안내", 10, bold=True)
    draw_text(c, left_x, 75 * mm, "상세 약품명, 투약량, 횟수, 일수는", 9.2)
    draw_text(c, left_x, 68 * mm, "오른쪽 OCR 인식용 복약표 기준입니다.", 9.2)
    draw_text(c, left_x, 58 * mm, "복약 시간: 아침 / 점심 / 저녁 / 취침 전", 9.2)
    draw_text(c, left_x, 51 * mm, "복약 체크: 날짜별 일정에서 완료 처리", 9.2)

    c.setFillColor(colors.HexColor("#3f75a8"))
    c.roundRect(right_x, top_y - 10, 10, 10, 2.5, fill=1, stroke=0)
    draw_text(c, right_x + 5, top_y - 7, "✓", 12, bold=True, color="#ffffff", align="center")
    draw_text(c, right_x + 14, top_y - 6.5, "QR · 운전 위험 pictogram 강조형", 23, bold=True, color="#193153")
    draw_qr(c, width - margin - 28 * mm, top_y - 18 * mm, 24 * mm)

    draw_text(c, right_x, top_y - 21 * mm, "(다음내방일:              )", 14, bold=True)
    draw_text(c, right_x, top_y - 35 * mm, "환자정보 : 홍길동 (만 36세 / 남)", 14, bold=True)
    c.line(right_x, top_y - 38 * mm, right_x + 72 * mm, top_y - 38 * mm)
    draw_text(c, right_x + 86 * mm, top_y - 35 * mm, "조제 약사 : 김수진", 14, bold=True)
    c.line(right_x + 86 * mm, top_y - 38 * mm, right_x + 141 * mm, top_y - 38 * mm)
    draw_text(c, right_x, top_y - 53 * mm, "병원정보 : 메디노트 내과의원", 14, bold=True)
    c.line(right_x, top_y - 56 * mm, right_x + 72 * mm, top_y - 56 * mm)
    draw_text(c, right_x + 86 * mm, top_y - 53 * mm, "조제 일자 : 2026-06-17", 14, bold=True)
    c.line(right_x + 86 * mm, top_y - 56 * mm, right_x + 141 * mm, top_y - 56 * mm)

    band_y = top_y - 72 * mm
    c.setLineWidth(1.2)
    c.rect(right_x, band_y, width - right_x - margin - 6 * mm, 15 * mm, fill=0, stroke=1)
    mid = right_x + 65 * mm
    c.line(mid, band_y, mid, band_y + 15 * mm)
    draw_text(c, right_x + 32.5 * mm, band_y + 5.4 * mm, "1일 3회 7일분", 17, bold=True, align="center")
    draw_text(c, mid + 8 * mm, band_y + 5.4 * mm, "졸음, 운전주의 / 표시대로", 16, bold=True)

    table_x = right_x
    table_top = band_y - 5 * mm
    table_w = width - right_x - margin - 6 * mm
    headers = [("약품명", 76), ("투약량", 20), ("횟수", 18), ("일수", 18), ("복약안내", 39)]
    h_y = table_top - 10 * mm
    c.setFillColor(colors.HexColor("#4f6f98"))
    c.rect(table_x, h_y, table_w, 10 * mm, fill=1, stroke=0)
    cx = table_x
    for title, w_mm in headers:
        c.setStrokeColor(colors.HexColor("#6f86a5"))
        c.rect(cx, h_y, w_mm * mm, 10 * mm, fill=0, stroke=1)
        draw_text(c, cx + w_mm * mm / 2, h_y + 3.4 * mm, title, 11, bold=True, color="#ffffff", align="center")
        cx += w_mm * mm

    meds = [
        ("게보린정(수출명:돌로린정)", "1", "3", "3", "두통 발열 시 식후 복용 / 간기능 음주 주의"),
        ("부루펜정200밀리그램(이부프로펜)", "1", "3", "3", "위장장애 예방, 식후 복용 / 신장 위장 주의"),
        ("다이아벡스정500밀리그램(메트포르민염산염)", "1", "2", "7", "아침 저녁 식사 직후 / 당뇨 간기능 주의"),
        ("지르텍정(세티리진염산염)", "1", "1", "7", "취침 전 복용 권장 / 졸음 운전 주의"),
    ]
    row_h = 17 * mm
    for idx, (name, dosage, frequency, days, guide) in enumerate(meds):
        y = h_y - (idx + 1) * row_h
        c.setFillColor(colors.HexColor("#ffffff"))
        c.rect(table_x, y, table_w, row_h, fill=1, stroke=1)
        c.setStrokeColor(colors.HexColor("#9ca3af"))
        x1 = table_x + 76 * mm
        x2 = x1 + 20 * mm
        x3 = x2 + 18 * mm
        x4 = x3 + 18 * mm
        for x in (x1, x2, x3, x4):
            c.line(x, y, x, y + row_h)
        draw_wrapped(c, table_x + 3 * mm, y + 11.3 * mm, name, 70 * mm, 9.8, bold=True, leading=4 * mm)
        draw_text(c, x1 + 10 * mm, y + 6.5 * mm, dosage, 11, bold=True, align="center")
        draw_text(c, x2 + 9 * mm, y + 6.5 * mm, frequency, 11, bold=True, align="center")
        draw_text(c, x3 + 9 * mm, y + 6.5 * mm, days, 11, bold=True, align="center")
        draw_wrapped(c, x4 + 3 * mm, y + 11.3 * mm, guide, 34 * mm, 8.4, leading=3.5 * mm)

    box_y = margin + 3.5 * mm
    c.roundRect(right_x, box_y, table_w, 11 * mm, 2.5 * mm, fill=0, stroke=1)
    positions = [
        (right_x + 9 * mm, "아침", True),
        (right_x + 39 * mm, "점심", True),
        (right_x + 69 * mm, "저녁", True),
        (right_x + 101 * mm, "취침전", True),
        (right_x + 137 * mm, "식후30분", False),
    ]
    for x, label, checked in positions:
        draw_checkbox(c, x, box_y + 7.5 * mm, label, checked)

    c.saveState()
    c.setFillColor(colors.Color(0.7, 0.7, 0.7, alpha=0.22))
    c.setFont(FONT_BOLD, 22)
    c.rotate(12)
    c.drawString(210 * mm, 0, "TEST SAMPLE")
    c.restoreState()


def draw_analysis_page(c):
    width, height = landscape(A4)
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, fill=1, stroke=0)
    margin = 14 * mm
    draw_text(c, width / 2, height - 22 * mm, "Medinote 분석 리포트 데모 요약", 22, bold=True, align="center")
    draw_text(c, margin, height - 35 * mm, "OCR 처방전 자동 분석 → 자동 복약 일정 생성 → 달력/날짜별 일정 확인 → 복약 체크 및 알림 → 맞춤형 약 검색", 11, color="#475569")

    def draw_badges(title, items, y, fill, stroke):
        draw_text(c, margin, y, title, 14, bold=True)
        x = margin
        y2 = y - 16 * mm
        for item in items:
            w = max(22 * mm, c.stringWidth(item, FONT_BOLD, 10) + 10 * mm)
            if x + w > width - margin:
                x = margin
                y2 -= 12 * mm
            c.setFillColor(colors.HexColor(fill))
            c.setStrokeColor(colors.HexColor(stroke))
            c.roundRect(x, y2, w, 8 * mm, 3 * mm, fill=1, stroke=1)
            draw_text(c, x + w / 2, y2 + 2.3 * mm, item, 10, bold=True, align="center")
            x += w + 5 * mm
        return y2 - 12 * mm

    y = height - 50 * mm
    y = draw_badges("사용자 건강정보 / 기저질환 배지", ["흡연", "음주", "만성 신장질환", "간질환", "위염", "고혈압", "당뇨병"], y, "#fff7ed", "#fdba74")
    y = draw_badges("등록된 못 먹는 약 · 주의 성분", ["게보린정", "아세트아미노펜", "이부프로펜", "세티리진염산염"], y, "#fef2f2", "#fca5a5")

    draw_text(c, margin, y, "처방전 분석 리포트", 14, bold=True)
    table_x = margin
    table_y = y - 14 * mm
    col_w = [32 * mm, 72 * mm, 160 * mm]
    row_h = 17 * mm
    rows = [
        ("주의 약", "게보린정", "사용자가 등록한 주의 약과 OCR 처방 약명이 일치"),
        ("주의 성분", "아세트아미노펜, 이부프로펜, 세티리진염산염", "등록된 못 먹는 성분/주의 성분이 처방 성분과 일치"),
        ("건강 상태", "흡연, 음주", "일반 주의 태그 중 음주 주의, 졸음 주의, 운전 주의 표시"),
        ("기저질환", "만성 신장질환, 간질환, 위염, 고혈압, 당뇨병", "신장기능 주의, 간기능 주의, 위장장애 주의 및 복약 상담 안내"),
    ]
    c.setFillColor(colors.HexColor("#0f766e"))
    c.rect(table_x, table_y, sum(col_w), 10 * mm, fill=1, stroke=0)
    headers = ["분류", "감지 내용", "근거"]
    x = table_x
    for i, header in enumerate(headers):
        draw_text(c, x + 4 * mm, table_y + 3 * mm, header, 10.5, bold=True, color="#ffffff")
        x += col_w[i]
    yrow = table_y - row_h
    for row in rows:
        c.setStrokeColor(colors.HexColor("#cbd5e1"))
        c.rect(table_x, yrow, sum(col_w), row_h, fill=0, stroke=1)
        x = table_x
        for i, value in enumerate(row):
            if i > 0:
                c.line(x, yrow, x, yrow + row_h)
            draw_wrapped(c, x + 4 * mm, yrow + 10 * mm, value, col_w[i] - 8 * mm, 9.5, bold=(i == 0))
            x += col_w[i]
        yrow -= row_h

    draw_text(c, margin, 22 * mm, "홍길동 계정: hong.gildong@naver-care.com / 비밀번호 aa", 10, color="#475569")


def build_bag_style_pdf():
    c = canvas.Canvas(str(PDF_OUT), pagesize=landscape(A4))
    c.setTitle("Medinote 홍길동 데모 약봉투")
    draw_receipt_page(c)
    c.showPage()
    draw_analysis_page(c)
    c.save()


if __name__ == "__main__":
    build_bag_style_pdf()
    print(PDF_OUT)
