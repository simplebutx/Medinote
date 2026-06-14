# S3, Google Vision, 이미지 입출력 관련
from dataclasses import dataclass

from fastapi import HTTPException
from google.auth import load_credentials_from_dict
from google.cloud import vision
import os
import json
import io
from PIL import Image
import numpy as np
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from botocore.config import Config
from app.core.config import settings
from typing import Any


# OCR로 읽은 단어 1개의 정보를 담는 자료구조 (텍스트, 좌표)
@dataclass
class OcrToken:
    text: str
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    confidence: float | None = None

    @property
    def center_x(self) -> float:
        return (self.x_min + self.x_max) / 2

    @property
    def center_y(self) -> float:
        return (self.y_min + self.y_max) / 2


# 캐시 변수: 한번 만든 객체를 저장해두고 reuse
_ocr_client: vision.ImageAnnotatorClient | None = None
_s3_client: Any | None = None


def _get_ocr_client() -> vision.ImageAnnotatorClient:
    global _ocr_client

    if _ocr_client is None:
        try:
            if settings.google_application_credentials_json:
                credentials_info = json.loads(settings.google_application_credentials_json)
                credentials, _ = load_credentials_from_dict(
                    credentials_info,
                    scopes=["https://www.googleapis.com/auth/cloud-platform"],
                )
                _ocr_client = vision.ImageAnnotatorClient(credentials=credentials)
            else:
                if settings.google_application_credentials:
                    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.google_application_credentials
                _ocr_client = vision.ImageAnnotatorClient()
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Failed to initialize Google Vision client. Configure "
                    "GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_APPLICATION_CREDENTIALS_JSON, "
                    "or local Application Default Credentials via "
                    "`gcloud auth application-default login`. "
                    f"Original error: {exc}"
                ),
            ) from exc

    return _ocr_client


def _get_s3_client():
    global _s3_client

    if not settings.aws_s3_bucket:
        raise HTTPException(status_code=500, detail="AWS_S3_BUCKET is not configured.")

    if _s3_client is None:
        client_kwargs: dict[str, Any] = {
            "service_name": "s3",
            "region_name": settings.aws_region,
            "config": Config(signature_version="s3v4"),
        }

        if settings.aws_access_key_id and settings.aws_secret_access_key:
            client_kwargs["aws_access_key_id"] = settings.aws_access_key_id
            client_kwargs["aws_secret_access_key"] = settings.aws_secret_access_key

        if settings.aws_s3_endpoint:
            client_kwargs["endpoint_url"] = settings.aws_s3_endpoint

        _s3_client = boto3.client(**client_kwargs)

    return _s3_client


# S3에 저장된 이미지를 가져와서 OCR용 배열로 변환
def _load_image_from_s3(image_key: str) -> np.ndarray:
    client = _get_s3_client()

    try:
        response = client.get_object(Bucket=settings.aws_s3_bucket, Key=image_key)
        image_bytes = response["Body"].read()
    except (ClientError, BotoCoreError) as exc:
        raise HTTPException(status_code=502, detail=f"Failed to load image from S3: {exc}") from exc

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Uploaded image could not be decoded.") from exc

    return np.array(image)

# OCR 호출해서 텍스트를 토큰 단위로 추출
def _extract_tokens(image_array: np.ndarray) -> list[OcrToken]:
    client = _get_ocr_client()
    image = vision.Image(content=_to_png_bytes(image_array))
    image_context = vision.ImageContext(language_hints=["ko", "en"])

    try:
        response = client.document_text_detection(image=image, image_context=image_context)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OCR extraction failed: {exc}") from exc

    if response.error.message:
        raise HTTPException(status_code=502, detail=f"OCR extraction failed: {response.error.message}")

    tokens: list[OcrToken] = []
    annotation = response.full_text_annotation
    if not annotation:
        return tokens

    for page in annotation.pages:
        for block in page.blocks:
            for paragraph in block.paragraphs:
                for word in paragraph.words:
                    text = "".join(symbol.text for symbol in word.symbols).strip()
                    if not text:
                        continue

                    vertices = word.bounding_box.vertices
                    if not vertices:
                        continue

                    xs = [vertex.x or 0 for vertex in vertices]
                    ys = [vertex.y or 0 for vertex in vertices]
                    tokens.append(
                        OcrToken(
                            text=text,
                            x_min=min(xs),
                            y_min=min(ys),
                            x_max=max(xs),
                            y_max=max(ys),
                            confidence=word.confidence if word.confidence else None,
                        )
                    )

    return tokens



# 이미지 배열을 PNG 바이트 데이터로 변환하는 함수
def _to_png_bytes(image_array: np.ndarray) -> bytes:
    image = Image.fromarray(image_array.astype(np.uint8))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
