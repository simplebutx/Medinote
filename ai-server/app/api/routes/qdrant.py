from fastapi import APIRouter

from app.services.vector_store import upsert_test_point, search_relevant_documents

router = APIRouter()


@router.post("/qdrant-test-upsert")
def qdrant_test_upsert():
    return upsert_test_point()


@router.get("/qdrant-test-search")
def qdrant_test_search(text: str, drug_names: list[str] | None = None):
    return search_relevant_documents(text, drug_names or [])
