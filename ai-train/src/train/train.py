from pathlib import Path

from joblib import dump
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline


MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "question_classifier.joblib"


def build_pipeline() -> Pipeline:
    return Pipeline(
        steps=[
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
            ("clf", LogisticRegression(max_iter=1000)),
        ]
    )


def main() -> None:
    samples = [
        "이 약은 하루에 몇 번 먹어야 하나요?",
        "복용 후 어지러움이 있는데 괜찮나요?",
        "임산부도 먹어도 되나요?",
        "이 약 효과가 언제 나타나나요?",
        "감기약이랑 같이 먹어도 되나요?",
    ]
    labels = ["dosage", "side_effect", "precaution", "efficacy", "general"]

    pipeline = build_pipeline()
    pipeline.fit(samples, labels)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    dump(pipeline, MODEL_PATH)
    print(f"saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
