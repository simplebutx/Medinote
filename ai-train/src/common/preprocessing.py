import re


def normalize_text(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^\w\s가-힣]", " ", text)
    text = " ".join(text.split())
    return text
