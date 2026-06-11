# Qdrant 로컬 테스트 설정

팀원 PC마다 Qdrant를 따로 설치하거나 CSV 경로를 맞출 필요는 없습니다.  
챗봇 테스트용 데이터는 `qdrant-snapshots/medicine_docs.snapshot` 파일에 이미 들어 있습니다.

Qdrant snapshot에는 검색에 필요한 벡터와 payload가 같이 저장됩니다. 그래서 복원할 때는 원본 CSV나 PDF가 없어도 됩니다.

## 처음 실행할 때

1. 예시 파일을 복사해서 로컬 환경변수 파일을 만듭니다.

   ```powershell
   Copy-Item .env.docker.example .env.docker
   ```

2. Qdrant를 실행합니다.

   ```powershell
   docker compose --env-file .env.docker up -d qdrant
   ```

3. snapshot을 복원합니다.

   ```powershell
   docker compose --env-file .env.docker --profile snapshot run --rm qdrant-snapshot-import
   ```

복원은 `medicine_docs` 컬렉션 데이터를 snapshot 내용으로 맞춥니다.

## 앱 실행

Qdrant 데이터 복원이 끝나면 필요한 앱 서비스를 실행합니다.

```powershell
docker compose --env-file .env.docker up -d ai-server backend-medication backend-consultation frontend-test
```

## 내 로컬 Qdrant 데이터를 다시 snapshot으로 내보내기

현재 PC의 `medicine_docs` 데이터를 팀원에게 그대로 공유하려면 아래 명령을 실행합니다.

```powershell
docker compose --env-file .env.docker --profile snapshot run --rm qdrant-snapshot-export
```

완료되면 아래 파일이 생성됩니다.

```text
qdrant-snapshots/medicine_docs.snapshot
```

파일 크기가 작으면 repo에 같이 올려도 됩니다. 파일이 커지면 Git에는 올리지 말고 외부 저장소로 공유한 뒤 팀원들이 `qdrant-snapshots` 폴더에 내려받아 복원하면 됩니다.

## 참고: seed로 다시 만들 때

snapshot을 새로 만들 수 없는 경우에만 seed 작업을 사용합니다. 이 방식은 문서 임베딩을 새로 만들기 때문에 `.env.docker`에 `LLM_API_KEY`가 필요하고, seed 스크립트가 읽을 최신 CSV/PDF 소스도 맞아야 합니다.

```powershell
docker compose --env-file .env.docker --profile seed run --rm qdrant-seed
```

## 기본값

```dotenv
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION_NAME=medicine_docs
QDRANT_SNAPSHOT_PATH=/qdrant-snapshots/medicine_docs.snapshot
```
