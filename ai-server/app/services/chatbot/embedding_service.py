import requests

from app.core.config import settings


UPSTAGE_EMBEDDING_URL = "https://api.upstage.ai/v1/solar/embeddings"
DEFAULT_BATCH_SIZE = 16


def get_upstage_api_key() -> str:
    if settings.upstage_api_key:
        return settings.upstage_api_key
    raise RuntimeError("UPSTAGE_API_KEY is not set.")


def embed_with_upstage(texts: list[str], model: str) -> list[list[float]]:
    if not texts:
        return []

    session = requests.Session()
    headers = {
        "Authorization": f"Bearer {get_upstage_api_key()}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    vectors: list[list[float]] = []

    for start in range(0, len(texts), DEFAULT_BATCH_SIZE):
        batch = texts[start:start + DEFAULT_BATCH_SIZE]
        response = session.post(
            UPSTAGE_EMBEDDING_URL,
            headers=headers,
            json={
                "model": model,
                "input": batch,
            },
            timeout=settings.llm_timeout_seconds,
        )
        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            raise RuntimeError(f"Upstage embedding request failed: {response.text}") from exc

        data = response.json().get("data", [])
        vectors.extend([item["embedding"] for item in data])

    if len(vectors) != len(texts):
        raise RuntimeError(f"Upstage returned {len(vectors)} vectors for {len(texts)} texts.")

    return vectors


def embed_text(text: str) -> list[float]:
    return embed_with_upstage([text], settings.embedding_query_model)[0]


def embed_texts(texts: list[str]) -> list[list[float]]:
    return embed_with_upstage(texts, settings.embedding_passage_model)
