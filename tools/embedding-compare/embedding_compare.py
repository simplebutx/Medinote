from __future__ import annotations

import argparse
import html
import json
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


MODEL_LABELS = {
    "openai-small": "OpenAI text-embedding-3-small",
    "openai-large": "OpenAI text-embedding-3-large",
    "upstage-solar": "Upstage Solar Embedding",
    "bge-m3": "BAAI bge-m3",
    "gemini": "Gemini Embedding",
}

MODEL_NOTES = {
    "openai-small": "Current Medinote baseline",
    "openai-large": "Same vendor high-performance candidate",
    "upstage-solar": "Korean-friendly query/passage candidate",
    "bge-m3": "Open-source self-hosting candidate",
    "gemini": "Google multilingual embedding candidate",
}

DEFAULT_MODELS = ["openai-small", "openai-large", "upstage-solar", "bge-m3", "gemini"]


@dataclass
class EvaluationQuery:
    id: str
    question: str
    answer_chunk_ids: list[str]
    query_type: str = ""


@dataclass
class SearchHit:
    rank: int
    chunk_id: str
    title: str
    score: float
    is_answer: bool
    snippet: str


@dataclass
class QueryResult:
    query_id: str
    query_type: str
    question: str
    answer_chunk_ids: list[str]
    hits: list[SearchHit]
    reciprocal_rank: float
    top1_hit: bool
    top3_hit: bool


@dataclass
class ModelResult:
    model: str
    label: str
    status: str
    note: str
    top1_accuracy: float
    top3_hit_rate: float
    mrr: float
    avg_latency_ms: int
    query_results: list[QueryResult]


def pct(value: float | None) -> str:
    if value is None:
        return "-"
    return f"{value * 100:.1f}%"


def metric_class(value: float | int | None, good: float, bad: float, *, lower_is_better: bool = False) -> str:
    if value is None:
        return "neutral"
    if lower_is_better:
        if value <= good:
            return "good"
        if value >= bad:
            return "bad"
    else:
        if value >= good:
            return "good"
        if value <= bad:
            return "bad"
    return "mid"


def status_badge(status: str) -> str:
    label = html.escape(status.upper())
    return f'<span class="badge badge-{html.escape(status)}">{label}</span>'


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_queries(path: Path) -> list[EvaluationQuery]:
    raw = read_json(path)
    queries_raw = raw.get("queries", raw) if isinstance(raw, dict) else raw
    queries: list[EvaluationQuery] = []
    for item in queries_raw:
        queries.append(
            EvaluationQuery(
                id=str(item["id"]),
                question=str(item["question"]),
                answer_chunk_ids=[str(value) for value in item.get("answerChunkIds", [])],
                query_type=str(item.get("queryType") or item.get("type") or ""),
            )
        )
    if not queries:
        raise ValueError(f"No queries found in {path}")
    return queries


def normalize_hits(raw_hits: list[dict[str, Any]], answer_ids: set[str]) -> list[SearchHit]:
    hits: list[SearchHit] = []
    for index, hit in enumerate(raw_hits, start=1):
        chunk_id = str(hit.get("chunkId") or hit.get("chunk_id") or hit.get("id") or "")
        hits.append(
            SearchHit(
                rank=index,
                chunk_id=chunk_id,
                title=str(hit.get("title") or hit.get("drugName") or hit.get("documentType") or chunk_id),
                score=float(hit.get("score", 0.0) or 0.0),
                is_answer=chunk_id in answer_ids,
                snippet=str(hit.get("snippet") or hit.get("text") or hit.get("content") or ""),
            )
        )
    return hits


def evaluate_query(query: EvaluationQuery, raw_hits: list[dict[str, Any]]) -> QueryResult:
    answer_ids = set(query.answer_chunk_ids)
    hits = normalize_hits(raw_hits, answer_ids)
    reciprocal_rank = 0.0
    for hit in hits:
        if hit.is_answer:
            reciprocal_rank = 1 / hit.rank
            break
    return QueryResult(
        query_id=query.id,
        query_type=query.query_type,
        question=query.question,
        answer_chunk_ids=query.answer_chunk_ids,
        hits=hits,
        reciprocal_rank=reciprocal_rank,
        top1_hit=bool(hits and hits[0].is_answer),
        top3_hit=any(hit.is_answer for hit in hits[:3]),
    )


def make_model_result(
    model: str,
    status: str,
    latency_ms: int,
    query_results: list[QueryResult],
) -> ModelResult:
    total = max(1, len(query_results))
    top1 = sum(1 for query in query_results if query.top1_hit) / total
    top3 = sum(1 for query in query_results if query.top3_hit) / total
    mrr = sum(query.reciprocal_rank for query in query_results) / total
    return ModelResult(
        model=model,
        label=MODEL_LABELS.get(model, model),
        status=status,
        note=MODEL_NOTES.get(model, ""),
        top1_accuracy=top1,
        top3_hit_rate=top3,
        mrr=mrr,
        avg_latency_ms=latency_ms,
        query_results=query_results,
    )


def load_results(queries: list[EvaluationQuery], path: Path) -> list[ModelResult]:
    query_map = {query.id: query for query in queries}
    raw = read_json(path)
    models_raw = raw.get("models", raw.get("results", raw)) if isinstance(raw, dict) else raw
    results: list[ModelResult] = []
    for model_raw in models_raw:
        model = str(model_raw["model"])
        per_query_raw = {
            str(item.get("queryId") or item.get("query_id") or item.get("id")): item
            for item in model_raw.get("results", model_raw.get("queries", []))
        }
        query_results: list[QueryResult] = []
        for query in queries:
            query_payload = per_query_raw.get(query.id, {})
            raw_hits = query_payload.get("hits", [])
            query_results.append(evaluate_query(query, raw_hits))
        results.append(
            make_model_result(
                model=model,
                status=str(model_raw.get("status", "ok")),
                latency_ms=int(model_raw.get("avgLatencyMs", model_raw.get("avg_latency_ms", 0)) or 0),
                query_results=query_results,
            )
        )
    return results


def demo_results(queries: list[EvaluationQuery]) -> list[ModelResult]:
    profiles = {
        "openai-small": {"latency": 150, "miss_top1_mod": 5, "miss_top3_mod": 0},
        "openai-large": {"latency": 210, "miss_top1_mod": 7, "miss_top3_mod": 0},
        "upstage-solar": {"latency": 250, "miss_top1_mod": 6, "miss_top3_mod": 0},
        "bge-m3": {"latency": 620, "miss_top1_mod": 4, "miss_top3_mod": 10},
        "gemini": {"latency": 230, "miss_top1_mod": 5, "miss_top3_mod": 12},
    }
    results: list[ModelResult] = []
    for model in DEFAULT_MODELS:
        profile = profiles[model]
        query_results: list[QueryResult] = []
        for index, query in enumerate(queries, start=1):
            answer_id = query.answer_chunk_ids[0] if query.answer_chunk_ids else f"chunk_{index:03d}"
            miss_top1 = profile["miss_top1_mod"] and index % profile["miss_top1_mod"] == 0
            miss_top3 = profile["miss_top3_mod"] and index % profile["miss_top3_mod"] == 0
            if miss_top3:
                hits = [
                    {"chunkId": f"chunk_noise_{index}_1", "title": "Related but not answer", "score": 0.842, "snippet": "A semantically related chunk was retrieved first."},
                    {"chunkId": f"chunk_noise_{index}_2", "title": "Similar medication information", "score": 0.823, "snippet": "This result is close, but it is not the labeled answer chunk."},
                    {"chunkId": f"chunk_noise_{index}_3", "title": "General caution text", "score": 0.801, "snippet": "General medicine guidance appeared in the result."},
                ]
            elif miss_top1:
                hits = [
                    {"chunkId": f"chunk_related_{index}", "title": "Related candidate", "score": 0.861, "snippet": "A related chunk was ranked above the answer."},
                    {"chunkId": answer_id, "title": "Answer chunk", "score": 0.847, "snippet": query.question},
                    {"chunkId": f"chunk_other_{index}", "title": "Other candidate", "score": 0.790, "snippet": "Another retrieved chunk."},
                ]
            else:
                hits = [
                    {"chunkId": answer_id, "title": "Answer chunk", "score": 0.902, "snippet": query.question},
                    {"chunkId": f"chunk_related_{index}", "title": "Related candidate", "score": 0.831, "snippet": "A related medicine information chunk."},
                    {"chunkId": f"chunk_other_{index}", "title": "Other candidate", "score": 0.775, "snippet": "Another retrieved chunk."},
                ]
            query_results.append(evaluate_query(query, hits))
        results.append(make_model_result(model, "demo", int(profile["latency"]), query_results))
    return results


def render_query_block(query: QueryResult) -> str:
    answers = ", ".join(query.answer_chunk_ids)
    type_badge = f'<span class="query-type">{html.escape(query.query_type)}</span>' if query.query_type else ""
    hits_html = []
    for hit in query.hits[:3]:
        mark = "ANSWER" if hit.is_answer else ""
        hits_html.append(
            f"""
            <li class="{'answer' if hit.is_answer else ''}">
              <div class="rank">{hit.rank}</div>
              <div>
                <strong>{html.escape(hit.title)}</strong>
                <span>{html.escape(hit.chunk_id)} / score {hit.score:.3f} {mark}</span>
                <p>{html.escape(hit.snippet)}</p>
              </div>
            </li>
            """
        )
    return f"""
      <section class="query-block">
        <h3>{html.escape(query.query_id)}. {html.escape(query.question)} {type_badge}</h3>
        <div class="answer-ids">Answer chunk: {html.escape(answers)}</div>
        <ol>{''.join(hits_html)}</ol>
      </section>
    """


def render_model_card(result: ModelResult) -> str:
    query_blocks = "\n".join(render_query_block(query) for query in result.query_results)
    return f"""
      <section class="model-card model-{html.escape(result.model)}">
        <div class="card-head">
          <div>
            <h2>{html.escape(result.label)}</h2>
            <p>{html.escape(result.note)}</p>
          </div>
          {status_badge(result.status)}
        </div>
        <div class="metric-list">
          <div class="{metric_class(result.top1_accuracy, 0.80, 0.50)}">
            <span>1. Top-1 Accuracy</span><strong>{pct(result.top1_accuracy)}</strong>
          </div>
          <div class="{metric_class(result.top3_hit_rate, 0.90, 0.70)}">
            <span>2. Top-3 Hit Rate</span><strong>{pct(result.top3_hit_rate)}</strong>
          </div>
          <div class="{metric_class(result.mrr, 0.80, 0.50)}">
            <span>3. MRR</span><strong>{result.mrr:.2f}</strong>
          </div>
          <div class="{metric_class(float(result.avg_latency_ms), 250, 700, lower_is_better=True)}">
            <span>4. Avg Response Time</span><strong>{result.avg_latency_ms}ms</strong>
          </div>
        </div>
        <div class="queries">
          {query_blocks}
        </div>
      </section>
    """


def render_html(results: list[ModelResult], output_json_name: str) -> str:
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    rows = []
    for result in results:
        rows.append(
            f"""
            <tr>
              <td>{html.escape(result.label)}</td>
              <td>{status_badge(result.status)}</td>
              <td>{pct(result.top1_accuracy)}</td>
              <td>{pct(result.top3_hit_rate)}</td>
              <td>{result.mrr:.2f}</td>
              <td>{result.avg_latency_ms} ms</td>
            </tr>
            """
        )

    cards = "\n".join(render_model_card(result) for result in results)
    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Medinote Embedding Model Comparison</title>
  <style>
    :root {{
      --navy: #0b1324;
      --ink: #172033;
      --muted: #5b667a;
      --line: #d8e2ee;
      --light: #f7fafc;
      --white: #ffffff;
      --mint: #00a88f;
      --mint-soft: #e6f4f1;
      --blue-soft: #edf6ff;
      --amber: #ffb020;
      --red: #e5484d;
      --purple-soft: #f1edff;
      --gray-soft: #f1f5f9;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--light);
      color: var(--ink);
      font-family: Arial, "Malgun Gothic", sans-serif;
    }}
    .page {{
      width: 1720px;
      margin: 0 auto;
      padding: 34px 44px 48px;
    }}
    .hero {{
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 32px;
      margin-bottom: 24px;
    }}
    .eyebrow {{
      color: var(--mint);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: .04em;
      margin-bottom: 12px;
    }}
    h1 {{
      margin: 0;
      color: var(--navy);
      font-size: 44px;
      line-height: 1.12;
    }}
    .hero p {{
      margin: 12px 0 0;
      color: var(--muted);
      font-size: 17px;
    }}
    .meta {{
      text-align: right;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
    }}
    .summary {{
      background: var(--white);
      border: 1px solid var(--line);
      border-radius: 12px;
      box-shadow: 0 10px 28px rgba(11, 19, 36, .06);
      margin-bottom: 18px;
      padding: 22px 24px;
    }}
    .summary h2 {{
      margin: 0 0 14px;
      color: var(--navy);
      font-size: 24px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 15px;
    }}
    th, td {{
      border-bottom: 1px solid var(--line);
      padding: 13px 10px;
      text-align: left;
      vertical-align: middle;
    }}
    th {{
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }}
    .cards {{
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 14px;
      align-items: start;
    }}
    .model-card {{
      background: var(--white);
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 28px rgba(11, 19, 36, .06);
    }}
    .card-head {{
      min-height: 118px;
      padding: 18px 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      border-bottom: 1px solid var(--line);
      background: var(--mint-soft);
    }}
    .model-openai-large .card-head, .model-gemini .card-head {{
      background: var(--blue-soft);
    }}
    .model-upstage-solar .card-head {{
      background: var(--purple-soft);
    }}
    .model-bge-m3 .card-head {{
      background: var(--gray-soft);
    }}
    .card-head h2 {{
      margin: 0;
      color: var(--navy);
      font-size: 19px;
      line-height: 1.15;
    }}
    .card-head p {{
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }}
    .badge {{
      display: inline-block;
      min-width: 76px;
      padding: 7px 9px;
      border-radius: 999px;
      background: var(--muted);
      color: var(--white);
      text-align: center;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }}
    .badge-demo, .badge-ok {{ background: var(--mint); }}
    .badge-error {{ background: var(--red); }}
    .metric-list {{
      display: grid;
      grid-template-columns: 1fr;
      gap: 1px;
      background: var(--line);
      border-bottom: 1px solid var(--line);
    }}
    .metric-list div {{
      min-height: 48px;
      background: var(--white);
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }}
    .metric-list span {{
      color: var(--muted);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .03em;
    }}
    .metric-list strong {{
      color: var(--navy);
      font-size: 18px;
      line-height: 1.1;
      text-align: right;
      word-break: keep-all;
    }}
    .metric-list .good strong {{ color: var(--mint); }}
    .metric-list .mid strong {{ color: var(--amber); }}
    .metric-list .bad strong {{ color: var(--red); }}
    .queries {{
      height: 560px;
      overflow-y: scroll;
      scrollbar-gutter: stable;
      background: #fbfcfe;
      padding: 14px;
    }}
    .query-block {{
      border-bottom: 1px solid var(--line);
      padding-bottom: 14px;
      margin-bottom: 14px;
    }}
    .query-block:last-child {{
      border-bottom: 0;
      margin-bottom: 0;
    }}
    .query-block h3 {{
      margin: 0 0 8px;
      color: var(--navy);
      font-size: 15px;
      line-height: 1.35;
    }}
    .query-type {{
      display: inline-block;
      margin-left: 6px;
      padding: 3px 7px;
      border-radius: 999px;
      background: #e8eef7;
      color: var(--muted);
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      vertical-align: 2px;
    }}
    .answer-ids {{
      color: var(--muted);
      font-size: 11px;
      margin-bottom: 9px;
      word-break: break-all;
    }}
    ol {{
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 8px;
    }}
    li {{
      display: grid;
      grid-template-columns: 26px 1fr;
      gap: 8px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--white);
      padding: 8px;
    }}
    li.answer {{
      border-color: rgba(0, 168, 143, .55);
      background: #f1fbf8;
    }}
    .rank {{
      width: 24px;
      height: 24px;
      border-radius: 999px;
      background: var(--navy);
      color: var(--white);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 12px;
    }}
    li.answer .rank {{
      background: var(--mint);
    }}
    li strong {{
      display: block;
      color: var(--navy);
      font-size: 13px;
      line-height: 1.25;
    }}
    li span {{
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: 11px;
    }}
    li p {{
      margin: 6px 0 0;
      color: var(--ink);
      font-size: 12px;
      line-height: 1.4;
    }}
    .footnote {{
      margin-top: 18px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.55;
    }}
    @media print {{
      .page {{ width: auto; padding: 24px; }}
      .queries {{ height: auto; overflow: visible; }}
    }}
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div>
        <div class="eyebrow">MEDINOTE EMBEDDING MODEL TEST</div>
        <h1>Retrieval Quality Comparison</h1>
        <p>Same chunks, same questions, and answer chunk IDs are used for every embedding model.</p>
      </div>
      <div class="meta">
        Generated: {html.escape(generated_at)}<br>
        JSON: {html.escape(output_json_name)}
      </div>
    </section>

    <section class="summary">
      <h2>Comparison Snapshot</h2>
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Status</th>
            <th>Top-1 Accuracy</th>
            <th>Top-3 Hit Rate</th>
            <th>MRR</th>
            <th>Avg Time</th>
          </tr>
        </thead>
        <tbody>
          {''.join(rows)}
        </tbody>
      </table>
    </section>

    <section class="cards">
      {cards}
    </section>

    <p class="footnote">
      Evaluation scope: embedding model retrieval quality only. Cost, reranker, LLM answer generation,
      prompt quality, and post-processing logic are excluded. Top-k success is measured by whether
      the pre-labeled answer chunk appears in the retrieved results.
    </p>
  </main>
</body>
</html>
"""


def write_outputs(results: list[ModelResult], out_dir: Path) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = out_dir / f"embedding_compare_{timestamp}.json"
    html_path = out_dir / f"embedding_compare_{timestamp}.html"
    payload = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "results": [asdict(result) for result in results],
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    html_path.write_text(render_html(results, json_path.name), encoding="utf-8")
    return html_path, json_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a Medinote embedding comparison report.")
    parser.add_argument("--demo", action="store_true", help="Generate a layout preview with synthetic results.")
    parser.add_argument("--queries", type=Path, help="JSON file with question and answer chunk IDs.")
    parser.add_argument("--results", type=Path, help="JSON file with model search results.")
    parser.add_argument("--out", type=Path, default=Path("outputs/embedding-compare"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    queries_path = args.queries or Path("tools/embedding-compare/samples/queries-sample.json")
    queries = load_queries(queries_path)
    if args.results:
        results = load_results(queries, args.results)
    elif args.demo:
        results = demo_results(queries)
    else:
        print("Provide --results for real scoring, or use --demo for a layout preview.")
        print("Example:")
        print("python tools\\embedding-compare\\embedding_compare.py --demo --queries tools\\embedding-compare\\samples\\queries-sample.json --out outputs\\embedding-compare")
        return 2

    html_path, json_path = write_outputs(results, args.out.resolve())
    print(f"HTML report: {html_path}")
    print(f"JSON results: {json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
