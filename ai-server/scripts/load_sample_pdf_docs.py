# qdrant에 데이터 뽑아서 넣기 자동화 (샘플 적재 스크립트)

import argparse
import csv
import hashlib
import io
import os
import random
import sys
import time
from pathlib import Path

import requests
from pypdf import PdfReader
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.services.chatbot.embedding_service import embed_texts
from app.services.chatbot.document_search_service import get_qdrant_client
from app.core.config import settings


DOCUMENT_COLUMNS = {
    "efficacy_document_id": "efficacy",
    "precaution_document_id": "precaution",
    "usage_document_id": "usage",
}


def build_embedding_text(record: dict) -> str:
    return "\n".join(
        part
        for part in [
            f"약품명: {record['drug_name']}",
            f"문서유형: {record['document_type']}",
            record["text"],
        ]
        if part
    )


def env_bool(name: str, default: bool = False) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    return raw_value.strip().lower() in {"1", "true", "yes", "y", "on"}


def env_int(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None or not raw_value.strip():
        return default

    return int(raw_value)


def build_parser() -> argparse.ArgumentParser:
    default_csv_path = os.getenv(
        "QDRANT_SEED_CSV_PATH",
        str(ROOT_DIR / "app" / "data" / "medicine_info_0531.csv"),
    )
    default_names_file = os.getenv(
        "QDRANT_SEED_NAMES_FILE",
        str(ROOT_DIR / "app" / "data" / "demo_medicine_names_20.txt"),
    )

    parser = argparse.ArgumentParser(
        description="Load sampled medicine PDF documents into Qdrant."
    )
    parser.add_argument(
        "--csv-path",
        default=default_csv_path,
        help="Path to exported CSV file",
    )
    parser.add_argument(
        "--name-column",
        default="item_name",
        help="CSV column containing the medicine name",
    )
    parser.add_argument(
        "--sample-size",
        type=int,
        default=env_int("QDRANT_SEED_SAMPLE_SIZE", 10),
        help="Number of medicines to sample",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=env_int("QDRANT_SEED_RANDOM_SEED", 42),
        help="Random seed for deterministic sampling",
    )
    parser.add_argument(
        "--timeout-seconds",
        type=int,
        default=env_int("QDRANT_SEED_DOWNLOAD_TIMEOUT_SECONDS", 30),
        help="HTTP timeout for PDF download",
    )
    parser.add_argument(
        "--download-dir",
        default=os.getenv("QDRANT_SEED_DOWNLOAD_DIR", str(ROOT_DIR / "tmp" / "sample_pdfs")),
        help="Directory for downloaded sample PDFs",
    )
    parser.add_argument(
        "--names-file",
        default=default_names_file,
        help="Optional text file with one medicine name per line",
    )
    parser.add_argument(
        "--clear-collection",
        action="store_true",
        default=env_bool("QDRANT_SEED_CLEAR_COLLECTION", False),
        help="Delete all existing points from the target collection before upsert",
    )
    parser.add_argument(
        "--skip-if-not-empty",
        action="store_true",
        default=env_bool("QDRANT_SEED_SKIP_IF_NOT_EMPTY", False),
        help="Exit without embedding/upserting when the target collection already has points",
    )
    parser.add_argument(
        "--wait-timeout-seconds",
        type=int,
        default=env_int("QDRANT_SEED_WAIT_TIMEOUT_SECONDS", 60),
        help="Maximum time to wait for Qdrant to become reachable",
    )
    return parser


def read_csv_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        return list(reader)


def sample_rows(rows: list[dict[str, str]], sample_size: int, seed: int) -> list[dict[str, str]]:
    valid_rows = [
        row for row in rows
        if any((row.get(column) or "").strip() for column in DOCUMENT_COLUMNS)
    ]
    random.seed(seed)
    if len(valid_rows) <= sample_size:
        return valid_rows
    return random.sample(valid_rows, sample_size)


def read_selected_names(names_file: Path) -> list[str]:
    return [
        line.strip()
        for line in names_file.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def filter_rows_by_names(
    rows: list[dict[str, str]],
    name_column: str,
    selected_names: list[str],
) -> list[dict[str, str]]:
    selected_name_set = set(selected_names)
    return [
        row for row in rows
        if (row.get(name_column) or "").strip() in selected_name_set
    ]


def download_pdf(url: str, timeout_seconds: int) -> bytes:
    response = requests.get(url, timeout=timeout_seconds)
    response.raise_for_status()
    return response.content


def extract_pdf_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages: list[str] = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text.strip():
            pages.append(page_text.strip())
    return "\n\n".join(pages).strip()


def normalize_text(text: str) -> str:
    return " ".join(text.split())


def split_text(text: str, chunk_size: int = 1200, overlap: int = 150) -> list[str]:
    if not text:
        return []

    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end == text_length:
            break

        start = end - overlap

    return chunks


def build_point_id(drug_name: str, document_type: str, source_url: str) -> int:
    raw = f"{drug_name}|{document_type}|{source_url}".encode("utf-8")
    return int(hashlib.sha256(raw).hexdigest()[:16], 16)


def save_pdf(download_dir: Path, drug_name: str, document_type: str, pdf_bytes: bytes) -> Path:
    safe_name = "".join(char if char.isalnum() else "_" for char in drug_name).strip("_") or "unknown"
    filename = f"{safe_name}_{document_type}.pdf"
    target_path = download_dir / filename
    target_path.write_bytes(pdf_bytes)
    return target_path


def build_document_records(
    rows: list[dict[str, str]],
    name_column: str,
    timeout_seconds: int,
    download_dir: Path,
) -> list[dict]:
    records: list[dict] = []

    for row in rows:
        drug_name = (row.get(name_column) or "").strip()
        if not drug_name:
            continue

        for column_name, document_type in DOCUMENT_COLUMNS.items():
            source_url = (row.get(column_name) or "").strip()
            if not source_url:
                continue

            try:
                pdf_bytes = download_pdf(source_url, timeout_seconds)
                saved_path = save_pdf(download_dir, drug_name, document_type, pdf_bytes)
                raw_text = extract_pdf_text(pdf_bytes)
                text = normalize_text(raw_text)

                if not text:
                    print(f"[skip] Empty text: {drug_name} / {document_type}")
                    continue

                chunks = split_text(text)
                if not chunks:
                    print(f"[skip] No chunks: {drug_name} / {document_type}")
                    continue

                for chunk_index, chunk_text in enumerate(chunks):
                    records.append(
                        {
                            "point_id": build_point_id(
                                drug_name,
                                f"{document_type}_{chunk_index}",
                                source_url,
                            ),
                            "drug_name": drug_name,
                            "document_type": document_type,
                            "source_url": source_url,
                            "local_pdf_path": str(saved_path),
                            "text": chunk_text,
                            "chunk_index": chunk_index,
                        }
                    )

                print(f"[ok] {drug_name} / {document_type} -> {len(chunks)} chunks")
            except Exception as exc:
                print(f"[error] {drug_name} / {document_type}: {exc}")

    return records


def upsert_records(records: list[dict]) -> None:
    if not records:
        print("[info] No records to upsert.")
        return

    client = get_qdrant_client()
    ensure_collection(client)
    texts = [build_embedding_text(record) for record in records]
    vectors = embed_texts(texts)

    points = [
        PointStruct(
            id=record["point_id"],
            vector=vector,
            payload={
                "drug_name": record["drug_name"],
                "document_type": record["document_type"],
                "source_url": record["source_url"],
                "local_pdf_path": record["local_pdf_path"],
                "text": record["text"],
                "chunk_index": record["chunk_index"],
            },
        )
        for record, vector in zip(records, vectors, strict=True)
    ]

    client.upsert(
        collection_name=settings.qdrant_collection_name,
        points=points,
    )
    print(f"[done] Upserted {len(points)} documents into {settings.qdrant_collection_name}")


def wait_for_qdrant(client: QdrantClient, timeout_seconds: int) -> None:
    deadline = time.monotonic() + timeout_seconds
    last_error: Exception | None = None

    while time.monotonic() <= deadline:
        try:
            client.get_collections()
            return
        except Exception as exc:
            last_error = exc
            print("[wait] Qdrant is not ready yet. Retrying...")
            time.sleep(2)

    raise RuntimeError(
        f"Qdrant did not become ready within {timeout_seconds} seconds"
    ) from last_error


def collection_exists(client: QdrantClient) -> bool:
    if hasattr(client, "collection_exists"):
        return bool(client.collection_exists(settings.qdrant_collection_name))

    collections = client.get_collections().collections
    return any(collection.name == settings.qdrant_collection_name for collection in collections)


def ensure_collection(client: QdrantClient) -> None:
    if collection_exists(client):
        return

    client.create_collection(
        collection_name=settings.qdrant_collection_name,
        vectors_config=VectorParams(
            size=settings.embedding_dimensions,
            distance=Distance.COSINE,
        ),
    )
    print(f"[done] Created collection: {settings.qdrant_collection_name}")


def count_collection_points(client: QdrantClient) -> int:
    if not collection_exists(client):
        return 0

    result = client.count(
        collection_name=settings.qdrant_collection_name,
        exact=True,
    )
    return int(result.count)


def clear_collection_points(client: QdrantClient) -> None:
    if collection_exists(client):
        client.delete_collection(collection_name=settings.qdrant_collection_name)

    ensure_collection(client)
    print(f"[done] Cleared collection: {settings.qdrant_collection_name}")


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    csv_path = Path(args.csv_path)
    download_dir = Path(args.download_dir)
    download_dir.mkdir(parents=True, exist_ok=True)

    client = get_qdrant_client()
    wait_for_qdrant(client, args.wait_timeout_seconds)

    if args.clear_collection:
        clear_collection_points(client)
    else:
        ensure_collection(client)

    if args.skip_if_not_empty and not args.clear_collection:
        point_count = count_collection_points(client)
        if point_count > 0:
            print(
                f"[skip] Collection already has {point_count} points: "
                f"{settings.qdrant_collection_name}"
            )
            return

    if not csv_path.exists():
        raise FileNotFoundError(f"CSV path does not exist: {csv_path}")

    rows = read_csv_rows(csv_path)
    if args.names_file:
        names_file = Path(args.names_file)
        if names_file.exists():
            selected_names = read_selected_names(names_file)
            sampled_rows = filter_rows_by_names(rows, args.name_column, selected_names)
            print(f"[info] Loaded {len(selected_names)} selected medicine names")
        else:
            print(f"[warn] Names file does not exist. Falling back to sampling: {names_file}")
            sampled_rows = sample_rows(rows, args.sample_size, args.seed)
    else:
        sampled_rows = sample_rows(rows, args.sample_size, args.seed)

    print(f"[info] Loaded {len(rows)} rows from CSV")
    print(f"[info] Sampled {len(sampled_rows)} medicines")

    records = build_document_records(
        rows=sampled_rows,
        name_column=args.name_column,
        timeout_seconds=args.timeout_seconds,
        download_dir=download_dir,
    )
    print(f"[info] Prepared {len(records)} document records")

    upsert_records(records)


if __name__ == "__main__":
    main()
