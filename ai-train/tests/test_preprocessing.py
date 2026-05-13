from src.common.preprocessing import normalize_text


def test_normalize_text() -> None:
    assert normalize_text("  Hello   World  ") == "hello world"
