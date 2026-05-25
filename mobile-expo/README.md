# MyMedi Mobile

Expo 기반 모바일 테스트 앱입니다.

## 포함 기능

- 로그인
- 회원가입(USER 2-step)
- 약 검색 + 자동완성
- 주의 약/성분 등록/수정/삭제
- 챗봇 질문 + `@약이름` 멘션 자동완성
- 복약 일정 등록/수정/삭제
- 내 정보 + API 호스트 설정

## 실행

```bash
cd mobile-expo
npm install
npm start -- --host lan
```

## iPhone 테스트

1. PC와 iPhone을 같은 Wi-Fi에 연결합니다.
2. iPhone에 `Expo Go`를 설치합니다.
3. 개발 서버를 띄운 뒤 QR을 스캔하거나 `exp://192.168.45.19:8081` 주소를 Expo Go에서 엽니다.
4. 앱 로그인 후 `내 정보` 탭에서 API 호스트를 필요 시 수정합니다.

## Docker 실행

루트 프로젝트에서 아래처럼 실행합니다.

```bash
docker compose up --build backend-auth backend-medication backend-consultation ai-server mobile-expo
```

기본 IP 설정은 [mobile-expo/.env.local](C:\Users\user\OneDrive\바탕 화면\project\mobile-expo\.env.local)에 넣어두면 됩니다.

```bash
MOBILE_EXPO_HOST=192.168.45.19
MOBILE_API_HOST=192.168.45.19
```

- `MOBILE_EXPO_HOST`: Expo 번들 서버가 iPhone에 안내할 주소
- `MOBILE_API_HOST`: 앱 내부에서 기본 API 서버로 사용할 주소

둘 다 보통 현재 PC의 같은 Wi-Fi 대역 IP로 맞추면 됩니다.

컨테이너가 올라오면 iPhone `Expo Go`에서 아래 주소로 열 수 있습니다.

```text
exp://192.168.45.19:19000
```

## API 기본값

- Auth: `http://192.168.45.19:8080`
- Medication: `http://192.168.45.19:8081`
- Consultation: `http://192.168.45.19:8082`

필요하면 앱 안에서 호스트 IP만 바꾸면 포트는 그대로 따라갑니다.
