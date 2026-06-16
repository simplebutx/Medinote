# Embedding Compare Report

Test-only embedding model comparison report for Medinote presentation screenshots.

The first version is a layout preview. It generates a standalone HTML report
with demo metrics and sample Top-k retrieval results.

## Models

- `OpenAI text-embedding-3-small`: current Medinote baseline
- `OpenAI text-embedding-3-large`: same vendor high-performance candidate
- `Upstage Solar Embedding`: Korean-friendly query/passage candidate
- `BAAI bge-m3`: open-source self-hosting candidate
- `Gemini Embedding`: Google multilingual embedding candidate

## Metrics

- `Top-1 Accuracy`: answer chunk appears at rank 1
- `Top-3 Hit Rate`: answer chunk appears within rank 1-3
- `MRR`: mean reciprocal rank of the first answer chunk
- `Avg Response Time`: embedding generation plus vector search time

## Layout Preview

```powershell
cd C:\dev\project
python tools\embedding-compare\embedding_compare.py `
  --demo `
  --queries tools\embedding-compare\samples\queries-sample.json `
  --out outputs\embedding-compare
start (Get-ChildItem C:\dev\project\outputs\embedding-compare\*.html | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
```

## Real Scoring Input

Prepare a query file with question text and answer chunk IDs:

```json
[
  {
    "id": "q001",
    "question": "타이레놀 복용 시 주의할 점은?",
    "answerChunkIds": ["actual_chunk_id_1", "actual_chunk_id_2"]
  }
]
```

Prepare a result file with model search results:

```json
{
  "models": [
    {
      "model": "openai-small",
      "status": "ok",
      "avgLatencyMs": 142,
      "results": [
        {
          "queryId": "q001",
          "hits": [
            {
              "chunkId": "actual_chunk_id_1",
              "title": "아세트아미노펜 주의사항",
              "score": 0.891,
              "snippet": "간질환 환자나 음주자는 복용 시 주의가 필요합니다."
            }
          ]
        }
      ]
    }
  ]
}
```

Run:

```powershell
python tools\embedding-compare\embedding_compare.py `
  --queries tools\embedding-compare\samples\queries-sample.json `
  --results outputs\embedding-compare\real-results.json `
  --out outputs\embedding-compare
```

## Later Real Test Flow

1. Export the 146 production chunks.
2. Create one Qdrant collection per embedding model.
3. Re-embed the same chunks with each model.
4. Prepare 15-20 questions with answer chunk IDs.
5. Search Top-k for each model and calculate the metrics above.

The helper script can run the comparison directly from the current Qdrant
collection by embedding the same chunk texts per model and calculating cosine
similarity in memory:

```powershell
python tools\embedding-compare\run_embedding_eval.py `
  --queries tools\embedding-compare\samples\queries-sample.json `
  --out outputs\embedding-compare
```

For a quick smoke test:

```powershell
python tools\embedding-compare\run_embedding_eval.py `
  --queries tools\embedding-compare\samples\queries-sample.json `
  --models openai-small `
  --chunk-limit 10 `
  --out outputs\embedding-compare
```

BGE-M3 local execution requires:

```powershell
pip install sentence-transformers torch
```

## Generate Questions From Real Qdrant Chunks

```powershell
python tools\embedding-compare\generate_queries_from_qdrant.py `
  --qdrant-url http://localhost:6333 `
  --collection medicine_docs `
  --count 20 `
  --out tools\embedding-compare\samples\queries-qdrant.json
```

Then run the real comparison with the generated question file:

```powershell
python tools\embedding-compare\run_embedding_eval.py `
  --queries tools\embedding-compare\samples\queries-qdrant.json `
  --models openai-small openai-large upstage-solar bge-m3 `
  --out outputs\embedding-compare
```
