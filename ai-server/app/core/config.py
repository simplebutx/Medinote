from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Medicine Ai Server"
    llm_api_url: str = ""
    llm_api_key: str = ""
    llm_model: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    llm_timeout_seconds: int = 30
    google_application_credentials: str = ""
    google_application_credentials_json: str = ""
    aws_s3_bucket: str = ""
    aws_region: str = "ap-northeast-2"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_endpoint: str = ""
    qdrant_url: str = "http://qdrant:6333"
    qdrant_collection_name: str = "medicine_docs"
    schedule_db_host: str = "mysql"
    schedule_db_port: int = 3306
    schedule_db_name: str = "medic"
    schedule_db_user: str = "root"
    schedule_db_password: str = "root"
    schedule_db_charset: str = "utf8mb4"
    llm_system_prompt: str = (
        "당신은 의약품 정보를 안내하는 한국어 챗봇입니다. "
        "제공된 질문과 입력 데이터에 근거해서만 답변하세요. "
        "없는 정보는 추측하지 마세요. "
        "의학적 진단이나 확정적 판단은 하지 말고, 위험하거나 응급으로 보이는 상황이면 병원 또는 전문가 상담을 권유하세요."
    )

    model_config = SettingsConfigDict(
        extra="ignore",
    )


settings = Settings()
