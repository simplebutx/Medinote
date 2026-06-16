# OCR Compare Report

Test-only OCR comparison tool for Medinote presentation screenshots.

It runs selected OCR providers against one image, stores raw text outputs, and
generates a standalone HTML report that can be opened in a browser and captured
for slides.

## Providers

- `google`: Google Cloud Vision `document_text_detection`
- `naver`: NAVER CLOVA OCR
- `azure`: Azure AI Vision OCR Read API
- `truth`: human-written reference text from `--truth`

## Quick Start

```powershell
cd C:\dev\project
python tools\ocr-compare\ocr_compare.py `
  --image C:\path\to\medicine-bag.png `
  --out outputs\ocr-compare `
  --truth tools\ocr-compare\samples\truth-sample.txt `
  --providers google naver azure truth
```

The script prints the generated HTML report path. Open that file in a browser
and capture the page for the presentation.

## Objective Metrics

If you prepare a ground-truth text file and a keyword file, the report also
shows five objective metrics:

- `Raw CER`: character error rate against the original truth text. Lower is better.
- `Normalized CER`: character error rate after removing whitespace, line breaks,
  and common symbols. Lower is better.
- `Keyword Hit Rate`: ratio of important keywords found in the OCR result.
  Higher is better.
- `Noise Count`: count of short meaningless lines such as isolated symbols,
  single Latin fragments, or punctuation-only lines. Lower is better.
- `Processing Time`: OCR call duration in milliseconds. Lower is faster.

Usage:

```powershell
python tools\ocr-compare\ocr_compare.py `
  --image "C:\path\to\medicine-bag.jpg" `
  --truth tools\ocr-compare\samples\truth-sample.txt `
  --keywords tools\ocr-compare\samples\keywords-sample.txt `
  --providers google naver azure truth `
  --out outputs\ocr-compare
```

The truth file should contain only text that actually exists in the image. The
keyword file should contain one important item per line.

## Environment Variables

Google:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
```

Or:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS_JSON='{...}'
```

NAVER CLOVA OCR:

```powershell
$env:NAVER_CLOVA_OCR_URL="https://.../general"
$env:NAVER_CLOVA_OCR_SECRET="..."
```

Azure AI Vision OCR:

```powershell
$env:VISION_KEY="..."
$env:VISION_ENDPOINT="https://your-resource-name.cognitiveservices.azure.com/"
```

## Provider Setup

### Google Vision OCR

The script calls Google Cloud Vision `document_text_detection`.

You already have this in the Medinote AI server flow, so usually one of these is
enough:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
```

or:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS_JSON='{...service account json...}'
```

### NAVER CLOVA OCR

NAVER setup is slightly more involved because CLOVA OCR is used through a CLOVA
OCR domain and API Gateway invoke URL.

1. Log in to NAVER Cloud Platform.
2. Go to `Services > AI Services > CLOVA OCR`.
3. Apply for/enable the CLOVA OCR service if it is not already enabled.
4. Open the `Domain` menu.
5. Create a domain for the OCR test.
   - For a simple raw text comparison, use a general/basic OCR domain.
   - Use a memorable domain name such as `medinote-ocr-test`.
6. In the domain action/settings area, create or check the Text OCR API.
7. Generate/copy the `Secret Key`.
8. Connect the domain to API Gateway or use the generated API Gateway invoke URL.
9. Set these environment variables:

```powershell
$env:NAVER_CLOVA_OCR_URL="https://your-apigw-invoke-url/general"
$env:NAVER_CLOVA_OCR_SECRET="your-secret-key"
```

The script sends the image as base64 JSON and reads `images[0].fields[].inferText`
as raw text.

Official docs:

- CLOVA OCR overview: https://api.ncloud-docs.com/docs/en/ai-application-service-ocr
- CLOVA OCR domain guide: https://guide.ncloud-docs.com/docs/en/clovaocr-domain
- CLOVA OCR document/API Gateway guide: https://guide.ncloud-docs.com/docs/en/clovaocr-document

### Azure AI Vision OCR

The script uses Azure AI Vision Read API:

```text
POST /vision/v3.2/read/analyze?language=ko
```

Setup:

1. Log in to Azure Portal.
2. Create a resource.
3. Search for `Computer Vision`, `Azure AI Vision`, or `Azure AI services`.
4. Create a Vision resource. The free pricing tier is enough for small tests if
   it is available in your account/region.
5. Open the created resource.
6. In the left menu, open `Keys and Endpoint`.
7. Copy one key and the endpoint.
8. Set environment variables:

```powershell
$env:VISION_KEY="copied-key"
$env:VISION_ENDPOINT="https://your-resource-name.cognitiveservices.azure.com/"
```

The script also accepts these aliases:

```powershell
$env:AZURE_VISION_KEY="copied-key"
$env:AZURE_VISION_ENDPOINT="https://your-resource-name.cognitiveservices.azure.com/"
```

The script sends local image bytes and polls the `Operation-Location` URL until
the OCR job succeeds. It collects line text from `analyzeResult.readResults`.

Official docs:

- Azure Vision OCR overview: https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-ocr
- Azure Vision OCR quickstart: https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/quickstarts-sdk/client-library
- Azure Vision language support: https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/language-support

## Layout Preview Without API Keys

Use `--demo` to generate a fake report that checks the visual layout without
calling external OCR APIs.

```powershell
python tools\ocr-compare\ocr_compare.py --demo --out outputs\ocr-compare
```

## What This Compares

This report compares raw OCR output only:

- raw text readability
- line break/layout preservation
- small Korean text stability
- numbers, brackets, and special characters
- elapsed time
- operational notes such as cost, external transfer, and local execution

Medication-name extraction, metadata extraction, and DB matching are excluded
because those are Medinote post-processing logic, not pure OCR model quality.
