from fastapi import APIRouter

from app.services.chatbot.document_search_service import search_relevant_documents

router = APIRouter()


@router.get("/qdrant-test-search")
def qdrant_test_search(text: str, drug_names: list[str] | None = None):
    return search_relevant_documents(text, drug_names or [])
