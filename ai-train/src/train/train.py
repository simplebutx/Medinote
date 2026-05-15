from pathlib import Path #파일 경로를 객체처럼 다루게 해주는 라이브러리

from joblib import dump  #파이썬 객체를 파일로 저장하거나 불러오는 라이브러리
from sklearn.feature_extraction.text import TfidfVectorizer  #TfidfVectorizer: 문장을 숫자 백터로 바꿔주는 도구
from sklearn.linear_model import LogisticRegression  #LogisticRegressionP: 분류 모델
from sklearn.metrics import classification_report  #classification_report: 모델 평가 결과를 보기 좋게 출력해주는 함수
from sklearn.model_selection import train_test_split #train_test_split: 학습용 데이터와 테스트용 데이터로 나누는 함수
from sklearn.pipeline import Pipeline #pipeline: 여러 처리 단계를 하나의 흐름으로 묶어주는 도구
from src.common.preprocessing import normalize_text

from data.raw.dummy_data import LABEL_DESCRIPTIONS, samples


MODEL_PATH = Path("models/question_classifier.joblib")

# 파이프라인 생성
def build_pipeline() -> Pipeline:
    return Pipeline(
        steps=[
             #ngram_range: 단어를 볼 때 1개짜리 단어와 2개짜리 단어 조합까지 보겠다
             #min_df: 최소 몇 개 문서에 등장해야 단어로 인정할 거냐
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)), 

            #max_iter: 모델이 학습할 때 반복할 수 있는 최대 횟수
            #class_weight: 라벨 데이터 개수가 불균형할 때 보정해주는 옵션
            ("clf", LogisticRegression(max_iter=2000, class_weight="balanced")),
        ]
    )


def main() -> None:
    questions = [normalize_text(item["question"]) for item in samples]  # 전처리
    labels = [item["label"] for item in samples]

    x_train, x_test, y_train, y_test = train_test_split(
        questions,
        labels,
        test_size=0.25,
        random_state=42,  #랜덤성x
        stratify=labels,  #라벨 비율을 최대한 유지하면서 나누라
    )

    pipeline = build_pipeline()
    pipeline.fit(x_train, y_train)  #모델 학습

    predictions = pipeline.predict(x_test)  #예측 실행

    print("=== label descriptions ===")
    for label, description in LABEL_DESCRIPTIONS.items():
        print(f"{label}: {description}")

    print("\n=== evaluation ===")
    print(classification_report(y_test, predictions, zero_division=0))  #정답 라벨, 모델이 예측한 라벨, 
    print("precision = 모델이 이 라벨이라고 예측한 것 중 실제로 맞은 비율")
    print("recall = 실제 이 라벨인 것 중 모델이 잘 찾아낸 비율= 맞게 찾은 개수 / 실제 정답 개수")
    print("f1-score = precision과 recall을 합친 종합 점수 (중요)")
    print("support = 실제 테스트 데이터 개수")
    print("accuracy = 전체 정답률")
    print("macro avg f1 = 클래스별 f1를 똑같이 평균낸 값 (중요)")

    #모델 저장
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    dump(pipeline, MODEL_PATH)
    print(f"\nsaved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
