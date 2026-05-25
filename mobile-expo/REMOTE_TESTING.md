# iPhone Remote Testing

`Expo Go`로 iPhone에서 밖에서 테스트할 때 쓰는 최소 구성입니다.

## 실행

프로젝트 루트에서:

```powershell
.\scripts\start-remote-ios.ps1 -Build
```

코드 변경만 반영할 때는:

```powershell
.\scripts\start-remote-ios.ps1
```

이 스크립트는:

- PC의 `Tailscale IPv4`를 자동으로 읽음
- 백엔드와 `mobile-expo`를 함께 실행
- `mobile-expo`는 `Expo tunnel` 모드로 시작

## iPhone에서 열기

1. iPhone과 PC 모두 `Tailscale` 연결
2. PC에서 `http://localhost:19000` 열기
3. JSON 안 `hostUri` 확인
4. iPhone `Expo Go`에서 아래 주소 열기

```text
exp://<hostUri>
```

예:

```text
exp://abcxyz-anonymous-19000.exp.direct
```

## 중요한 한계

- 이 방식은 **앱 자체를 원격에서 여는 것**까지는 잘 됩니다.
- 하지만 iPhone `Expo Go`에서 원격 `http://100.x.x.x:8080` API 호출은 여전히 막히거나 불안정할 수 있습니다.
- 그래서 **로그인/API까지 원격으로 완전히 테스트하려면** 추가로 `HTTPS` 백엔드 터널이 필요할 수 있습니다.

즉:

- 화면/UI 원격 확인: 가능
- 로그인/API 원격 확인: 추가 설정 없이 100% 보장되지 않음
