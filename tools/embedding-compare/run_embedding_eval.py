from __future__ import annotations

import argparse
import importlib.util
import json
import math
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests


DEFAULT_MODELS = ["openai-small", "openai-large", "upstage-solar", "bge-m3", "gemini"]
OPENAI_MODELS = {
    "openai-small": "text-embedding-3-small",
    "openai-large": "text-embedding-3-large",
}
UPSTAGE_PASSAGE_MODEL = "solar-embedding-1-large-passage"
UPSTAGE_QUERY_MODEL = "solar-embedding-1-large-query"
GEMINI_MODEL = "gemini-embedding-001"
BGE_MODEL = "BAAI/bge-m3"


@dataclass
class Query:
    id: str
    question: str
    answer_chunk_ids: list[str]
    drug_name: str = ""
    document_type: str = ""


@dataclass
class Chunk:
    id: str
    title: str
    text: str
    payload: dict[str, Any]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_queries(path: Path) -> list[Query]:
    raw = read_json(path)
    items = raw.get("queries", raw) if isinstance(raw, dict) else raw
    queries = [
        Query(
            id=str(item["id"]),
            question=str(item["question"]),
            answer_chunk_ids=[str(value) for value in item.get("answerChunkIds", [])],
            drug_name=str(item.get("drugName") or item.get("drug_name") or ""),
            document_type=str(item.get("documentType") or item.get("document_type") or ""),
        )
        for item in items
    ]
    if not queries:
        raise ValueError(f"No queries found: {path}")
    return queries


def chunk_title(payload: dict[str, Any], fallback_id: str) -> str:
    drug_name = payload.get("drug_name") or payload.get("drugName") or ""
    document_type = payload.get("document_type") or payload.get("documentType") or ""
    chunk_index = payload.get("chunk_index") if payload.get("chunk_index") is not None else payload.get("chunkIndex")
    parts = [str(value) for value in [drug_name, document_type] if value]
    if chunk_index is not None:
        parts.append(f"chunk {chunk_index}")
    return " / ".join(parts) if parts else fallback_id


def normalize_chunk_id(point_id: Any, payload: dict[str, Any]) -> str:
    for key in ("chunk_id", "chunkId", "point_id", "pointId", "id"):
        if payload.get(key):
            return str(payload[key])
    return str(point_id)


def fetch_qdrant_chunks(qdrant_url: str, collection: str, limit: int | None = None) -> list[Chunk]:
    try:
        from qdrant_client import QdrantClient
    except ModuleNotFoundError as exc:
        raise RuntimeError("qdrant-client is not installed. Run: pip install qdrant-client") from exc

    client = QdrantClient(url=qdrant_url)
    chunks: list[Chunk] = []
    offset = None
    while True:
        batch, offset = client.scroll(
            collection_name=collection,
            limit=100,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )
        for point in batch:
            payload = dict(point.payload or {})
            text = str(payload.get("text") or payload.get("content") or payload.get("snippet") or "").strip()
            if not text:
                continue
            chunk_id = normalize_chunk_id(point.id, payload)
            chunks.append(
                Chunk(
                    id=chunk_id,
                    title=chunk_title(payload, chunk_id),
                    text=text,
                    payload=payload,
                )
            )
            if limit and len(chunks) >= limit:
                return chunks
        if offset is None:
            break
    return chunks


def load_chunks_json(path: Path, limit: int | None = None) -> list[Chunk]:
    raw = read_json(path)
    items = raw.get("chunks", raw) if isinstance(raw, dict) else raw
    chunks: list[Chunk] = []
    for item in items:
        chunk_id = str(item.get("id") or item.get("chunkId") or item.get("point_id"))
        payload = dict(item.get("payload") or {})
        text = str(item.get("text") or payload.get("text") or "").strip()
        if not chunk_id or not text:
            continue
        chunks.append(Chunk(id=chunk_id, title=str(item.get("title") or chunk_title(payload, chunk_id)), text=text, payload=payload))
        if limit and len(chunks) >= limit:
            break
    return chunks


def cosine_similarity(left: list[float], right: list[float]) -> float:
    dot = 0.0
    left_norm = 0.0
    right_norm = 0.0
    for a, b in zip(left, right, strict=True):
        dot += a * b
        left_norm += a * a
        right_norm += b * b
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return dot / (math.sqrt(left_norm) * math.sqrt(right_norm))


def batch_items(items: list[str], size: int) -> list[list[str]]:
    return [items[index:index + size] for index in range(0, len(items), size)]


class Embedder:
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError

    def embed_query(self, text: str) -> list[float]:
        raise NotImplementedError


class OpenAIEmbedder(Embedder):
    def __init__(self, model: str) -> None:
        from openai import OpenAI

        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set.")
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def _embed(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for batch in batch_items(texts, 64):
            response = self.client.embeddings.create(
                model=self.model,
                input=batch,
                encoding_format="float",
            )
            vectors.extend([item.embedding for item in response.data])
        return vectors

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._embed(texts)

    def embed_query(self, text: str) -> list[float]:
        return self._embed([text])[0]


class UpstageEmbedder(Embedder):
    def __init__(self) -> None:
        api_key = os.getenv("UPSTAGE_API_KEY")
        if not api_key:
            raise RuntimeError("UPSTAGE_API_KEY is not set.")
        self.session = requests.Session()
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        self.url = "https://api.upstage.ai/v1/solar/embeddings"

    def _embed(self, texts: list[str], model: str) -> list[list[float]]:
        vectors: list[list[float]] = []
        for batch in batch_items(texts, 16):
            response = self.session.post(
                self.url,
                headers=self.headers,
                json={"model": model, "input": batch},
                timeout=120,
            )
            response.raise_for_status()
            data = response.json()["data"]
            vectors.extend([item["embedding"] for item in data])
        return vectors

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._embed(texts, UPSTAGE_PASSAGE_MODEL)

    def embed_query(self, text: str) -> list[float]:
        return self._embed([text], UPSTAGE_QUERY_MODEL)[0]


class GeminiEmbedder(Embedder):
    def __init__(self) -> None:
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set.")
        self.session = requests.Session()
        self.url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:embedContent"
        self.params = {"key": api_key}

    def _embed_one(self, text: str, task_type: str) -> list[float]:
        response = self.session.post(
            self.url,
            params=self.params,
            json={
                "model": f"models/{GEMINI_MODEL}",
                "content": {"parts": [{"text": text}]},
                "taskType": task_type,
            },
            timeout=120,
        )
        response.raise_for_status()
        return response.json()["embedding"]["values"]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(text, "RETRIEVAL_DOCUMENT") for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed_one(text, "RETRIEVAL_QUERY")


class BgeM3Embedder(Embedder):
    def __init__(self) -> None:
        try:
            from sentence_transformers import SentenceTransformer
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "sentence-transformers is not installed. Run: pip install sentence-transformers torch"
            ) from exc
        self.model = SentenceTransformer(BGE_MODEL)

    def _embed(self, texts: list[str]) -> list[list[float]]:
        encoded = self.model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return [vector.tolist() for vector in encoded]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._embed(texts)

    def embed_query(self, text: str) -> list[float]:
        return self._embed([text])[0]


def create_embedder(model_key: str) -> Embedder:
    if model_key in OPENAI_MODELS:
        return OpenAIEmbedder(OPENAI_MODELS[model_key])
    if model_key == "upstage-solar":
        return UpstageEmbedder()
    if model_key == "gemini":
        return GeminiEmbedder()
    if model_key == "bge-m3":
        return BgeM3Embedder()
    raise ValueError(f"Unknown model: {model_key}")


def search_top_k(query_vector: list[float], chunk_vectors: list[list[float]], chunks: list[Chunk], top_k: int) -> list[dict[str, Any]]:
    scored = [
        (cosine_similarity(query_vector, chunk_vector), chunk)
        for chunk_vector, chunk in zip(chunk_vectors, chunks, strict=True)
    ]
    scored.sort(key=lambda item: item[0], reverse=True)
    hits: list[dict[str, Any]] = []
    for score, chunk in scored[:top_k]:
        snippet = chunk.text.replace("\r\n", "\n").replace("\r", "\n").strip()
        if len(snippet) > 220:
            snippet = snippet[:220].rstrip() + "..."
        hits.append(
            {
                "chunkId": chunk.id,
                "title": chunk.title,
                "score": round(float(score), 6),
                "snippet": snippet,
            }
        )
    return hits


def embedding_text(chunk: Chunk, *, include_metadata: bool) -> str:
    if not include_metadata:
        return chunk.text
    drug_name = chunk.payload.get("drug_name") or chunk.payload.get("drugName") or ""
    document_type = chunk.payload.get("document_type") or chunk.payload.get("documentType") or ""
    return "\n".join(
        part
        for part in [
            f"약품명: {drug_name}" if drug_name else "",
            f"문서유형: {document_type}" if document_type else "",
            chunk.text,
        ]
        if part
    )


def filter_chunks_for_query(
    chunks: list[Chunk],
    chunk_vectors: list[list[float]],
    query: Query,
    *,
    use_drug_filter: bool,
) -> tuple[list[Chunk], list[list[float]]]:
    if not use_drug_filter or not query.drug_name:
        return chunks, chunk_vectors
    filtered_chunks: list[Chunk] = []
    filtered_vectors: list[list[float]] = []
    for chunk, vector in zip(chunks, chunk_vectors, strict=True):
        drug_name = str(chunk.payload.get("drug_name") or chunk.payload.get("drugName") or "")
        if drug_name == query.drug_name:
            filtered_chunks.append(chunk)
            filtered_vectors.append(vector)
    return (filtered_chunks, filtered_vectors) if filtered_chunks else (chunks, chunk_vectors)


def evaluate_model(
    model_key: str,
    chunks: list[Chunk],
    queries: list[Query],
    top_k: int,
    *,
    include_metadata: bool,
    use_drug_filter: bool,
) -> dict[str, Any]:
    print(f"[model] {model_key}: embedding {len(chunks)} chunks")
    try:
        embedder = create_embedder(model_key)
        chunk_vectors = embedder.embed_documents([embedding_text(chunk, include_metadata=include_metadata) for chunk in chunks])
        if len(chunk_vectors) != len(chunks):
            raise RuntimeError(f"Vector count mismatch: {len(chunk_vectors)} vectors for {len(chunks)} chunks")

        query_results = []
        latencies: list[int] = []
        for query in queries:
            start = time.perf_counter()
            query_vector = embedder.embed_query(query.question)
            candidate_chunks, candidate_vectors = filter_chunks_for_query(
                chunks,
                chunk_vectors,
                query,
                use_drug_filter=use_drug_filter,
            )
            hits = search_top_k(query_vector, candidate_vectors, candidate_chunks, top_k)
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            latencies.append(elapsed_ms)
            query_results.append({"queryId": query.id, "hits": hits})
        avg_latency = int(sum(latencies) / max(1, len(latencies)))
        print(f"[ok] {model_key}: avg query time {avg_latency}ms")
        return {
            "model": model_key,
            "status": "ok",
            "avgLatencyMs": avg_latency,
            "results": query_results,
        }
    except Exception as exc:  # noqa: BLE001 - keep other models running.
        print(f"[error] {model_key}: {exc}")
        return {
            "model": model_key,
            "status": "error",
            "avgLatencyMs": 0,
            "error": str(exc),
            "results": [{"queryId": query.id, "hits": []} for query in queries],
        }


def load_compare_module():
    module_path = Path(__file__).with_name("embedding_compare.py")
    spec = importlib.util.spec_from_file_location("embedding_compare_report", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load report module: {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def generate_report(queries_path: Path, results_path: Path, out_dir: Path) -> tuple[Path, Path]:
    module = load_compare_module()
    queries = module.load_queries(queries_path)
    model_results = module.load_results(queries, results_path)
    return module.write_outputs(model_results, out_dir)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run real embedding retrieval evaluation for Medinote.")
    parser.add_argument("--queries", type=Path, default=Path("tools/embedding-compare/samples/queries-sample.json"))
    parser.add_argument("--out", type=Path, default=Path("outputs/embedding-compare"))
    parser.add_argument("--models", nargs="+", default=DEFAULT_MODELS, choices=DEFAULT_MODELS)
    parser.add_argument("--top-k", type=int, default=3)
    parser.add_argument("--qdrant-url", default=os.getenv("QDRANT_URL", "http://localhost:6333"))
    parser.add_argument("--collection", default=os.getenv("QDRANT_COLLECTION_NAME", "medicine_docs"))
    parser.add_argument("--chunks-json", type=Path, help="Optional exported chunks JSON instead of Qdrant.")
    parser.add_argument("--chunk-limit", type=int, default=0, help="Optional max chunks for quick tests. 0 means all.")
    parser.add_argument("--skip-report", action="store_true", help="Only write real-results JSON.")
    parser.add_argument(
        "--no-metadata",
        action="store_true",
        help="Embed chunk body only. Default includes drug_name and document_type metadata.",
    )
    parser.add_argument(
        "--no-drug-filter",
        action="store_true",
        help="Search all chunks. Default filters candidates to the query drugName when available.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    queries = load_queries(args.queries)
    limit = args.chunk_limit if args.chunk_limit > 0 else None

    if args.chunks_json:
        chunks = load_chunks_json(args.chunks_json, limit)
        print(f"[chunks] loaded {len(chunks)} chunks from {args.chunks_json}")
    else:
        chunks = fetch_qdrant_chunks(args.qdrant_url, args.collection, limit)
        print(f"[chunks] fetched {len(chunks)} chunks from {args.qdrant_url}/{args.collection}")

    if not chunks:
        raise RuntimeError("No chunks found. Check QDRANT_URL, QDRANT_COLLECTION_NAME, or --chunks-json.")

    raw_results = {
        "generatedAt": datetime_now(),
        "queryFile": str(args.queries),
        "chunkCount": len(chunks),
        "topK": args.top_k,
        "includeMetadata": not args.no_metadata,
        "useDrugFilter": not args.no_drug_filter,
        "models": [
            evaluate_model(
                model_key,
                chunks,
                queries,
                args.top_k,
                include_metadata=not args.no_metadata,
                use_drug_filter=not args.no_drug_filter,
            )
            for model_key in args.models
        ],
    }
    results_path = args.out / "real-results.json"
    results_path.write_text(json.dumps(raw_results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Raw results: {results_path.resolve()}")

    if not args.skip_report:
        html_path, json_path = generate_report(args.queries, results_path, args.out.resolve())
        print(f"HTML report: {html_path}")
        print(f"JSON results: {json_path}")
    return 0


def datetime_now() -> str:
    from datetime import datetime

    return datetime.now().isoformat(timespec="seconds")


if __name__ == "__main__":
    raise SystemExit(main())
