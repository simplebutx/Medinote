from openai import OpenAI

from app.core.config import settings


DEFAULT_BATCH_SIZE = 64


def get_openai_client() -> OpenAI:
    if not settings.llm_api_key:
        raise RuntimeError("LLM_API_KEY is not set.")
    return OpenAI(api_key=settings.llm_api_key)


def embed_with_openai(texts: list[str], model: str) -> list[list[float]]:
    if not texts:
        return []

    client = get_openai_client()
    vectors: list[list[float]] = []

    for start in range(0, len(texts), DEFAULT_BATCH_SIZE):
        batch = texts[start:start + DEFAULT_BATCH_SIZE]
        response = client.embeddings.create(
            model=model,
            input=batch,
            timeout=settings.llm_timeout_seconds,
        )
        vectors.extend([item.embedding for item in response.data])

    if len(vectors) != len(texts):
        raise RuntimeError(f"OpenAI returned {len(vectors)} vectors for {len(texts)} texts.")

    return vectors


def embed_text(text: str) -> list[float]:
    return embed_with_openai([text], settings.embedding_query_model)[0]


def embed_texts(texts: list[str]) -> list[list[float]]:
    return embed_with_openai(texts, settings.embedding_passage_model)
