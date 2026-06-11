# Qdrant snapshot 파일 위치

현재 로컬 Qdrant 데이터를 공유할 때 snapshot 파일이 이 폴더에 생성됩니다.

기본 파일명:

```text
medicine_docs.snapshot
```

파일 크기가 작으면 repo에 같이 올려도 됩니다. 파일이 커지면 Git에는 올리지 말고 S3, Google Drive 같은 외부 저장소로 공유한 뒤 팀원들이 이 폴더에 내려받아 복원하면 됩니다.
