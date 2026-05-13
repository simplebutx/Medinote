# ai-train

Training workspace for the question classification model used by `ai-server`.

## Recommended flow

1. Put labeled data into `data/raw/`.
2. Preprocess and validate data in `src/common/`.
3. Train the model in `src/train/train.py`.
4. Save the trained pipeline into `models/`.
5. Copy or publish the final artifact for `ai-server` inference.

## Suggested structure

- `data/raw/`: original labeled dataset
- `data/processed/`: cleaned or split datasets
- `models/`: `.joblib` model artifacts and metadata
- `src/common/`: shared preprocessing and label utilities
- `src/train/`: train and evaluation scripts
- `tests/`: unit tests for preprocessing and inference assumptions

## First model

Start with a scikit-learn pipeline:

- `TfidfVectorizer`
- `LogisticRegression`

This is a strong baseline for short text classification and easy to serve in production.
