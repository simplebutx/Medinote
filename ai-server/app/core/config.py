from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Medicine Ai Server"
    llm_api_url: str = ""
    llm_api_key: str = ""
    llm_model: str = ""
    llm_timeout_seconds: int = 30
    google_application_credentials: str = ""
    google_application_credentials_json: str = ""
    aws_s3_bucket: str = ""
    aws_region: str = "ap-northeast-2"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_endpoint: str = ""
    llm_system_prompt: str = (
        "?뱀떊? ?섏빟???뺣낫瑜??ㅻ챸?섎뒗 ?쒓뎅??梨쀫큸?낅땲?? "
        "?쒓났?????뺣낫? ?ъ슜??吏덈Ц??諛뷀깢?쇰줈留??듬??섍퀬, "
        "?뺣낫媛 ?녿뒗 ?댁슜? 異붿륫?섏? 留덉꽭?? "
        "?꾪뿕?섍굅???묎툒??蹂댁씠???곹솴?대㈃ 蹂묒썝 ?먮뒗 ?꾨Ц媛 ?곷떞??沅뚰븯?몄슂."
    )

    model_config = SettingsConfigDict(
        extra="ignore",
    )


settings = Settings()
