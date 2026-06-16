from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any


GENERAL_TEMPLATES = {
    "precaution": [
        "{drug} 복용 시 주의할 점은?",
        "{drug} 먹을 때 조심해야 하는 사람은?",
        "{drug} 부작용이나 주의사항 알려줘",
    ],
    "usage": [
        "{drug} 어떻게 복용해?",
        "{drug} 용법과 용량 알려줘",
        "{drug} 하루에 몇 번 먹어야 해?",
    ],
    "efficacy": [
        "{drug}는 어떤 약이야?",
        "{drug} 효능이 뭐야?",
        "{drug}는 어디에 쓰는 약이야?",
    ],
}

SPECIFIC_RULES = [
    {
        "name": "pregnancy",
        "keywords": ["임부", "임신", "임산부", "수유", "수유부"],
        "templates": [
            "{drug}는 임산부가 복용해도 돼?",
            "{drug}는 수유 중에 사용해도 돼?",
        ],
    },
    {
        "name": "alcohol_liver",
        "keywords": ["음주", "알코올", "간질환", "간장", "간기능", "간독성"],
        "templates": [
            "{drug} 복용 중 술 마셔도 돼?",
            "{drug}는 간이 안 좋은 사람이 조심해야 해?",
        ],
    },
    {
        "name": "sleep_drive",
        "keywords": ["졸음", "운전", "기계조작", "어지러움", "어지러울"],
        "templates": [
            "{drug} 먹고 운전해도 돼?",
            "{drug} 먹으면 졸릴 수 있어?",
        ],
    },
    {
        "name": "stomach",
        "keywords": ["위장", "위장장애", "속쓰림", "소화성궤양", "위궤양", "위염"],
        "templates": [
            "{drug}는 위장장애가 있으면 조심해야 해?",
            "{drug} 먹으면 속이 쓰릴 수 있어?",
        ],
    },
    {
        "name": "kidney",
        "keywords": ["신장", "신기능", "신부전", "신장애"],
        "templates": [
            "{drug}는 신장 기능이 안 좋으면 주의해야 해?",
            "{drug}는 신장 질환자가 먹어도 돼?",
        ],
    },
    {
        "name": "child_elderly",
        "keywords": ["소아", "어린이", "고령자", "노인"],
        "templates": [
            "{drug}는 어린이가 복용해도 돼?",
            "{drug}는 고령자가 조심해야 해?",
        ],
    },
]

GENERAL_TYPE_ORDER = ["precaution", "usage", "efficacy"]


@dataclass
class ChunkInfo:
    id: str
    drug_name: str
    document_type: str
    text: str


def clean_drug_name(value: str) -> str:
    text = re.sub(r"\{.*?\}", "", value)
    text = re.sub(r"\(수출명:.*?\)", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text or value


def normalize_chunk_id(point_id: Any, payload: dict[str, Any]) -> str:
    for key in ("chunk_id", "chunkId", "point_id", "pointId", "id"):
        if payload.get(key):
            return str(payload[key])
    return str(point_id)


def fetch_chunks(qdrant_url: str, collection: str) -> list[ChunkInfo]:
    try:
        from qdrant_client import QdrantClient
    except ModuleNotFoundError as exc:
        raise RuntimeError("qdrant-client is not installed. Run: pip install qdrant-client") from exc

    client = QdrantClient(url=qdrant_url)
    chunks: list[ChunkInfo] = []
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
            drug_name = str(payload.get("drug_name") or "").strip()
            document_type = str(payload.get("document_type") or "").strip()
            text = str(payload.get("text") or "").strip()
            if not drug_name or not document_type or not text:
                continue
            chunks.append(
                ChunkInfo(
                    id=normalize_chunk_id(point.id, payload),
                    drug_name=drug_name,
                    document_type=document_type,
                    text=text.replace("\x00", " "),
                )
            )
        if offset is None:
            break
    return chunks


def group_chunks(chunks: list[ChunkInfo]) -> dict[str, dict[str, list[ChunkInfo]]]:
    grouped: dict[str, dict[str, list[ChunkInfo]]] = defaultdict(lambda: defaultdict(list))
    for chunk in chunks:
        grouped[chunk.drug_name][chunk.document_type].append(chunk)
    return grouped


def build_general_queries(grouped: dict[str, dict[str, list[ChunkInfo]]], count: int) -> list[dict[str, Any]]:
    queries: list[dict[str, Any]] = []
    template_index_by_type = defaultdict(int)
    used_pairs: set[tuple[str, str]] = set()

    while len(queries) < count:
        added = False
        for document_type in GENERAL_TYPE_ORDER:
            for drug_name in sorted(grouped):
                pair = (drug_name, document_type)
                if pair in used_pairs or document_type not in grouped[drug_name]:
                    continue
                templates = GENERAL_TEMPLATES[document_type]
                template = templates[template_index_by_type[document_type] % len(templates)]
                template_index_by_type[document_type] += 1
                answer_ids = [chunk.id for chunk in grouped[drug_name][document_type]]
                queries.append(
                    {
                        "id": f"q{len(queries) + 1:03d}",
                        "queryType": "general",
                        "question": template.format(drug=clean_drug_name(drug_name)),
                        "answerChunkIds": answer_ids,
                        "drugName": drug_name,
                        "documentType": document_type,
                    }
                )
                used_pairs.add(pair)
                added = True
                if len(queries) >= count:
                    return queries
                break
        if not added:
            break
    return queries


def find_specific_candidates(chunks: list[ChunkInfo]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    used_pairs: set[tuple[str, str]] = set()
    template_index_by_rule = defaultdict(int)
    for rule in SPECIFIC_RULES:
        for chunk in sorted(chunks, key=lambda item: (item.drug_name, item.document_type, item.id)):
            if chunk.document_type != "precaution":
                continue
            text = chunk.text
            if not any(keyword in text for keyword in rule["keywords"]):
                continue
            pair = (chunk.drug_name, rule["name"])
            if pair in used_pairs:
                continue
            templates = rule["templates"]
            template = templates[template_index_by_rule[rule["name"]] % len(templates)]
            template_index_by_rule[rule["name"]] += 1
            candidates.append(
                {
                    "rule": rule["name"],
                    "question": template.format(drug=clean_drug_name(chunk.drug_name)),
                    "answerChunkIds": [chunk.id],
                    "drugName": chunk.drug_name,
                    "documentType": chunk.document_type,
                    "matchedKeywords": [keyword for keyword in rule["keywords"] if keyword in text],
                }
            )
            used_pairs.add(pair)
    return candidates


def build_specific_queries(chunks: list[ChunkInfo], start_index: int, count: int) -> list[dict[str, Any]]:
    candidates = find_specific_candidates(chunks)
    queries: list[dict[str, Any]] = []
    by_rule: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for candidate in candidates:
        by_rule[candidate["rule"]].append(candidate)

    while len(queries) < count:
        added = False
        for rule in SPECIFIC_RULES:
            rule_name = rule["name"]
            if not by_rule[rule_name]:
                continue
            candidate = by_rule[rule_name].pop(0)
            queries.append(
                {
                    "id": f"q{start_index + len(queries):03d}",
                    "queryType": "specific",
                    **candidate,
                }
            )
            added = True
            if len(queries) >= count:
                break
        if not added:
            break
    return queries


def build_queries(chunks: list[ChunkInfo], general_count: int, specific_count: int) -> list[dict[str, Any]]:
    grouped = group_chunks(chunks)
    general = build_general_queries(grouped, general_count)
    specific = build_specific_queries(chunks, len(general) + 1, specific_count)
    return general + specific


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate embedding evaluation questions from actual Qdrant chunks.")
    parser.add_argument("--qdrant-url", default="http://localhost:6333")
    parser.add_argument("--collection", default="medicine_docs")
    parser.add_argument("--general-count", type=int, default=10)
    parser.add_argument("--specific-count", type=int, default=10)
    parser.add_argument("--count", type=int, help="Compatibility alias. Splits total into half general, half specific.")
    parser.add_argument("--out", type=Path, default=Path("tools/embedding-compare/samples/queries-qdrant.json"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.count:
        args.general_count = args.count // 2
        args.specific_count = args.count - args.general_count

    chunks = fetch_chunks(args.qdrant_url, args.collection)
    queries = build_queries(chunks, args.general_count, args.specific_count)
    if not queries:
        raise RuntimeError("No queries generated. Check Qdrant data.")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(queries, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated queries: {args.out.resolve()}")
    print(f"Query count: {len(queries)}")
    for query in queries:
        extra = ""
        if query.get("queryType") == "specific":
            extra = f" / keywords={','.join(query.get('matchedKeywords', []))}"
        print(
            f"{query['id']} [{query.get('queryType')}/{query['documentType']}] "
            f"{query['question']} -> {len(query['answerChunkIds'])} answer chunks{extra}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
