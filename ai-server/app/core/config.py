from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Medicine Ai Server"
    llm_api_url: str = ""
    llm_api_key: str = ""
    llm_model: str = ""
    llm_timeout_seconds: int = 30
    llm_system_prompt: str = (
        "당신은 의약품 정보를 설명하는 한국어 챗봇입니다. "
        "제공된 약 정보와 사용자 질문을 바탕으로만 답변하고, "
        "정보가 없는 내용은 추측하지 마세요. "
        "위험하거나 응급해 보이는 상황이면 병원 또는 전문가 상담을 권하세요."
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
