from openai import OpenAI
from app.core.config import settings


# OpenAi에 요청 보낼 클라이언트 객체 (임베딩용)
def get_openai_client() -> OpenAI:
    return OpenAI(api_key=settings.llm_api_key)


# 임베딩 함수
def embed_text(text: str) -> list[float]:
    client = get_openai_client()

    response = client.embeddings.create(
        model=settings.embedding_model,
        input=text,
        dimensions=settings.embedding_dimensions,
        encoding_format="float",
    )

    return response.data[0].embedding

# 임베딩 함수 (여러개)
def embed_texts(texts: list[str]) -> list[list[float]]:
    client = get_openai_client()

    response = client.embeddings.create(
        model=settings.embedding_model,
        input=texts,
        dimensions=settings.embedding_dimensions,
        encoding_format="float",
    )

    return [item.embedding for item in response.data]