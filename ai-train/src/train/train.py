import sys
from pathlib import Path

from joblib import dump
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from data.raw.dummy_data import LABEL_DESCRIPTIONS, samples


MODEL_PATH = ROOT_DIR / "models" / "question_classifier.joblib"


def build_pipeline() -> Pipeline:
    return Pipeline(
        steps=[
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
            ("clf", LogisticRegression(max_iter=2000, class_weight="balanced")),
        ]
    )


def main() -> None:
    questions = [item["question"] for item in samples]
    labels = [item["label"] for item in samples]

    x_train, x_test, y_train, y_test = train_test_split(
        questions,
        labels,
        test_size=0.25,
        random_state=42,
        stratify=labels,
    )

    pipeline = build_pipeline()
    pipeline.fit(x_train, y_train)

    predictions = pipeline.predict(x_test)

    print("=== label descriptions ===")
    for label, description in LABEL_DESCRIPTIONS.items():
        print(f"{label}: {description}")

    print("\n=== evaluation ===")
    print(classification_report(y_test, predictions, zero_division=0))

    print("=== sample predictions ===")
    sample_questions = [
        "타이레놀 주성분이 뭐야?",
        "하루에 몇 번 복용해?",
        "내가 오늘 약 먹었는지 확인해줘",
        "내 알레르기 성분이 들어 있는지 봐줘",
        "지금 먹는 약이랑 같이 먹을 때 주의할 점 있어?",
        "약사 상담 연결해줘",
    ]
    for question, prediction in zip(sample_questions, pipeline.predict(sample_questions)):
        print(f"- {question} -> {prediction}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    dump(pipeline, MODEL_PATH)
    print(f"\nsaved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
