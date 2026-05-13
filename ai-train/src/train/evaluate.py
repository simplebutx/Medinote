from pathlib import Path

from joblib import load


MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "question_classifier.joblib"


def main() -> None:
    model = load(MODEL_PATH)
    sample = ["이 약 먹고 속이 메스꺼워요"]
    prediction = model.predict(sample)[0]
    print({"text": sample[0], "label": prediction})


if __name__ == "__main__":
    main()
