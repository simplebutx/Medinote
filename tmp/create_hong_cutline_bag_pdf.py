from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(r"C:\dev\project")
OUT_DIR = ROOT / "output" / "pdf"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PDF_OUT = OUT_DIR / "hong_gildong_demo_prescription_2026-06-17.pdf"

FONT = "NanumGothic"
FONT_BOLD = "NanumGothicBold"
pdfmetrics.registerFont(TTFont(FONT, r"C:\Windows\Fonts\NanumGothic.ttf"))
pdfmetrics.registerFont(TTFont(FONT_BOLD, r"C:\Windows\Fonts\NanumGothicBold.ttf"))


def text(c, x, y, value, size=11, bold=False, color="#111827", align="left"):
    c.setFillColor(colors.HexColor(color))
    c.setFont(FONT_BOLD if bold else FONT, size)
    if align == "center":
        c.drawCentredString(x, y, value)
    elif align == "right":
        c.drawRightString(x, y, value)
    else:
        c.drawString(x, y, value)


def wrap(c, x, y, value, width, size=10, bold=False, leading=None):
    font = FONT_BOLD if bold else FONT
    c.setFont(font, size)
    c.setFillColor(colors.HexColor("#111827"))
    leading = leading or size * 1.28
    lines, current = [], ""
    for ch in value:
        trial = current + ch
        if c.stringWidth(trial, font, size) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = ch
    if current:
        lines.append(current)
    for i, line in enumerate(lines[:4]):
        c.drawString(x, y - i * leading, line)


def checkbox(c, x, y, label, checked=False):
    c.setStrokeColor(colors.HexColor("#374151"))
    c.setLineWidth(1.2)
    c.rect(x, y, 5.5 * mm, 5.5 * mm)
    if checked:
        c.line(x + 1.2 * mm, y + 2.6 * mm, x + 2.4 * mm, y + 1.2 * mm)
        c.line(x + 2.4 * mm, y + 1.2 * mm, x + 4.8 * mm, y + 4.5 * mm)
    text(c, x + 7.5 * mm, y + 0.8 * mm, label, 15, bold=True)


def pill(c, x, y, color_left, color_right=None, roundness=5):
    color_right = color_right or color_left
    c.setStrokeColor(colors.HexColor("#8c8c8c"))
    c.setFillColor(colors.HexColor(color_left))
    c.roundRect(x, y, 20 * mm, 8 * mm, roundness, fill=1, stroke=1)
    c.setFillColor(colors.HexColor(color_right))
    c.roundRect(x + 13 * mm, y, 20 * mm, 8 * mm, roundness, fill=1, stroke=1)


def draw_receipt(c):
    width, height = landscape(A4)
    margin = 7 * mm
    c.setFillColor(colors.HexColor("#fffefa"))
    c.rect(0, 0, width, height, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#7f7f7f"))
    c.setLineWidth(1)
    c.rect(margin, margin, width - 2 * margin, height - 2 * margin)

    split_x = 97 * mm
    c.setDash(3, 3)
    c.line(split_x, margin, split_x, height - margin)
    c.setDash()

    left_x = margin + 5 * mm
    top = height - margin - 10 * mm
    c.setFillColor(colors.HexColor("#4f6f98"))
    c.rect(left_x, top - 7 * mm, 78 * mm, 10 * mm, fill=1, stroke=0)
    text(c, left_x + 39 * mm, top - 4.8 * mm, "약제비 계산서 · 영수증", 15, bold=True, color="#ffffff", align="center")

    rows = [
        ("영수증번호", "20260617-00031"),
        ("환자성명", "홍길동"),
        ("조제일자", "2026-06-17"),
        ("투약일수", "7 □야간 □공휴"),
        ("약제비총액", "18,700 원"),
        ("본인부담금", "5,610 원"),
        ("보험자부담금", "13,090 원"),
        ("상호", "메디약국"),
        ("발행일", "2026-06-17"),
    ]
    row_h = 7.4 * mm
    y0 = top - 11 * mm
    for i, (label, value) in enumerate(rows):
        y = y0 - i * row_h
        c.setFillColor(colors.HexColor("#e8eef6"))
        c.rect(left_x, y - row_h, 31 * mm, row_h, fill=1, stroke=1)
        c.setFillColor(colors.HexColor("#f8fbff"))
        c.rect(left_x + 31 * mm, y - row_h, 47 * mm, row_h, fill=1, stroke=1)
        text(c, left_x + 15.5 * mm, y - 5 * mm, label, 9.8, bold=True, align="center")
        text(c, left_x + 32.5 * mm, y - 5 * mm, value, 9.8)

    c.setDash(3, 3)
    c.line(left_x, 101 * mm, split_x - 5 * mm, 101 * mm)
    c.setDash()
    text(c, left_x, 91 * mm, "약품명", 10, bold=True)
    text(c, left_x + 46 * mm, 91 * mm, "투약량", 10, bold=True)
    text(c, left_x + 60 * mm, 91 * mm, "횟수", 10, bold=True)
    text(c, left_x + 72 * mm, 91 * mm, "일수", 10, bold=True)
    c.line(left_x, 88 * mm, left_x + 42 * mm, 88 * mm)
    c.line(left_x + 45 * mm, 88 * mm, left_x + 56 * mm, 88 * mm)
    c.line(left_x + 59 * mm, 88 * mm, left_x + 67 * mm, 88 * mm)
    c.line(left_x + 71 * mm, 88 * mm, left_x + 78 * mm, 88 * mm)
    mini = [
        ("게보린정", "1", "3", "3"),
        ("부루펜정200밀리그램", "1", "3", "3"),
        ("다이아벡스정500밀리그램", "1", "2", "7"),
        ("지르텍정", "1", "1", "7"),
    ]
    for i, row in enumerate(mini):
        y = 82 * mm - i * 8 * mm
        text(c, left_x, y, row[0], 9.3)
        text(c, left_x + 50 * mm, y, row[1], 9.3, align="center")
        text(c, left_x + 63 * mm, y, row[2], 9.3, align="center")
        text(c, left_x + 74 * mm, y, row[3], 9.3, align="center")


def draw_bag(c):
    width, height = landscape(A4)
    right_x = 105 * mm
    top = height - 20 * mm
    blue = "#193153"

    c.setFillColor(colors.HexColor("#3f75a8"))
    c.roundRect(right_x, top - 6 * mm, 11 * mm, 11 * mm, 3 * mm, fill=1, stroke=0)
    text(c, right_x + 5.5 * mm, top - 3.1 * mm, "✓", 15, bold=True, color="#ffffff", align="center")
    text(c, right_x + 15 * mm, top - 4 * mm, "복용법 하단 절취선 강조형", 25, bold=True, color=blue)
    text(c, right_x + 128 * mm, top - 4 * mm, "(다음내방", 15, bold=True)
    text(c, right_x, top - 17 * mm, "일:              )", 15, bold=True)

    text(c, right_x, top - 31 * mm, "환자정보 : 홍길동 (만 36세 / 남)", 14, bold=True)
    c.line(right_x, top - 34 * mm, right_x + 88 * mm, top - 34 * mm)
    text(c, right_x + 103 * mm, top - 31 * mm, "조제 약사 : 김수진", 14, bold=True)
    c.line(right_x + 103 * mm, top - 34 * mm, right_x + 176 * mm, top - 34 * mm)
    text(c, right_x, top - 48 * mm, "병원정보 : 메디병원", 14, bold=True)
    c.line(right_x, top - 51 * mm, right_x + 88 * mm, top - 51 * mm)
    text(c, right_x + 103 * mm, top - 48 * mm, "조제 일자 : 2026-06-17", 14, bold=True)
    c.line(right_x + 103 * mm, top - 51 * mm, right_x + 176 * mm, top - 51 * mm)

    band_y = top - 73 * mm
    table_w = 181 * mm
    c.rect(right_x, band_y, table_w, 16 * mm, fill=0, stroke=1)
    c.line(right_x + 73 * mm, band_y, right_x + 73 * mm, band_y + 16 * mm)
    text(c, right_x + 36.5 * mm, band_y + 5.2 * mm, "1일 3회 7일분", 17, bold=True, align="center")
    text(c, right_x + 103 * mm, band_y + 5.2 * mm, "아침 · 점심 · 저녁 / 표시대로", 15, bold=True, align="center")

    headers = [("약품사진", 38), ("약품명", 57), ("복약안내", 46), ("주의사항", 40)]
    header_y = band_y - 17 * mm
    c.setFillColor(colors.HexColor("#4f6f98"))
    c.rect(right_x, header_y, table_w, 11 * mm, fill=1, stroke=0)
    x = right_x
    for title, w in headers:
        c.setStrokeColor(colors.HexColor("#6f86a5"))
        c.rect(x, header_y, w * mm, 11 * mm, fill=0, stroke=1)
        text(c, x + w * mm / 2, header_y + 3.6 * mm, title, 12, bold=True, color="#ffffff", align="center")
        x += w * mm

    meds = [
        ("게보린정(수출명:돌로린정)", "해열·진통제", "1정씩 1일 3회 3일분\n두통·발열 시 식후 복용", "간기능 · 음주", ("#f7de6b", "#1f2937")),
        ("부루펜정200밀리그램(이부프로펜)", "소염·진통제", "1정씩 1일 3회 3일분\n위장장애 예방, 식후 복용", "위장 · 신장", ("#fde68a", "#374151")),
        ("다이아벡스정500밀리그램(메트포르민염산염)", "당뇨병 치료제", "1정씩 1일 2회 7일분\n아침·저녁 식사 직후", "당뇨 · 간기능", ("#d1d5db", "#9ca3af")),
        ("지르텍정(세티리진염산염)", "알레르기 치료제", "1정씩 1일 1회 7일분\n취침 전 복용 권장", "졸음 · 운전", ("#bfdbfe", "#60a5fa")),
    ]
    row_h = 17 * mm
    for i, (name, category, guide, caution, pill_colors) in enumerate(meds):
        y = header_y - (i + 1) * row_h
        c.setFillColor(colors.HexColor("#fffefa"))
        c.rect(right_x, y, table_w, row_h, fill=1, stroke=1)
        x1 = right_x + 38 * mm
        x2 = x1 + 57 * mm
        x3 = x2 + 46 * mm
        c.line(x1, y, x1, y + row_h)
        c.line(x2, y, x2, y + row_h)
        c.line(x3, y, x3, y + row_h)
        c.setFillColor(colors.HexColor("#c7dce8"))
        c.rect(right_x + 3 * mm, y + 3 * mm, 34 * mm, 11 * mm, fill=1, stroke=0)
        pill(c, right_x + 9 * mm, y + 5.5 * mm, pill_colors[0], pill_colors[1])
        wrap(c, x1 + 3 * mm, y + 11.8 * mm, name, 51 * mm, 9.2, bold=True, leading=3.4 * mm)
        text(c, x1 + 3 * mm, y + 3.4 * mm, category, 8.8)
        for j, line in enumerate(guide.split("\n")):
            text(c, x2 + 3 * mm, y + 11.8 * mm - j * 4.2 * mm, line, 8.8, bold=(j == 0))
        c.rect(x3 + 8 * mm, y + 8.5 * mm, 8 * mm, 8 * mm)
        c.rect(x3 + 22 * mm, y + 8.5 * mm, 8 * mm, 8 * mm)
        symbol = "!" if i in (1, 3) else "◐"
        text(c, x3 + 12 * mm, y + 10.5 * mm, symbol, 9, bold=True, align="center")
        text(c, x3 + 26 * mm, y + 10.5 * mm, "☾" if i == 3 else "물", 8.8, bold=True, align="center")
        text(c, x3 + 20 * mm, y + 3.2 * mm, caution, 7.9, align="center")

    box_y = 13 * mm
    c.roundRect(right_x, box_y, table_w, 13 * mm, 3 * mm)
    checkbox(c, right_x + 8 * mm, box_y + 4 * mm, "아침", False)
    checkbox(c, right_x + 39 * mm, box_y + 4 * mm, "점심", False)
    checkbox(c, right_x + 70 * mm, box_y + 4 * mm, "저녁", False)
    checkbox(c, right_x + 102 * mm, box_y + 4 * mm, "취침전", False)
    checkbox(c, right_x + 142 * mm, box_y + 4 * mm, "식후30분", False)

    c.setDash(3, 3)
    c.line(right_x, 11 * mm, right_x + table_w, 11 * mm)
    c.setDash()
    c.saveState()
    c.setFillColor(colors.Color(0.7, 0.7, 0.7, alpha=0.2))
    c.setFont(FONT_BOLD, 18)
    c.rotate(12)
    c.drawString(238 * mm, -28 * mm, "TEST SAMPLE")
    c.restoreState()


def draw_report(c):
    width, height = landscape(A4)
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, fill=1, stroke=0)
    text(c, width / 2, height - 25 * mm, "Medinote 분석 리포트 데모 요약", 22, bold=True, align="center")
    text(c, 14 * mm, height - 43 * mm, "건강정보 배지: 흡연, 음주, 만성 신장질환, 간질환, 위염, 고혈압, 당뇨병", 13, bold=True)
    text(c, 14 * mm, height - 56 * mm, "주의 약/성분 배지: 게보린정, 아세트아미노펜, 이부프로펜, 세티리진염산염", 13, bold=True)
    text(c, 14 * mm, height - 76 * mm, "녹화 흐름", 15, bold=True)
    lines = [
        "1. OCR 약봉투 자동 분석",
        "2. 2026-06-17 기준 30일분 복약 일정 자동 생성",
        "3. 달력에서 날짜별 일정 목록 확인",
        "4. 아침 복약 체크 및 알림 기능 언급",
        "5. 건강정보/주의성분 기반 처방전 분석 리포트와 맞춤형 약 검색 확인",
    ]
    for i, line in enumerate(lines):
        text(c, 18 * mm, height - (91 + i * 11) * mm, line, 12)


def main():
    c = canvas.Canvas(str(PDF_OUT), pagesize=landscape(A4))
    c.setTitle("Medinote 홍길동 데모 약봉투")
    draw_receipt(c)
    draw_bag(c)
    c.showPage()
    draw_report(c)
    c.save()
    print(PDF_OUT)


if __name__ == "__main__":
    main()
