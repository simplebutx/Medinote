# Mobile Env Switching

`mobile-expo/.env.local` is ignored by git, so we can switch it safely between local and remote modes.

## Local mode

From `mobile-expo`:

```powershell
npm run env:local
```

This script:

- detects the current local IPv4 automatically
- writes `.env.local`
- points auth, medication, and consultation requests to `http://<local-ip>:8080~8082`
- points prescription upload URL to `http://<local-ip>:8081/api/prescriptions/upload-url`

After switching, restart Expo or the `mobile-expo` container.

## Remote mode

From `mobile-expo`:

```powershell
npm run env:remote -- --base-url https://your-remote-domain.example
```

Optional:

```powershell
npm run env:remote -- --base-url https://your-remote-domain.example --presigned-url https://your-upload-domain.example/api/prescriptions/upload-url
```

Defaults in remote mode:

- `EXPO_PUBLIC_API_BASE_URL` becomes the given remote base URL
- `EXPO_PUBLIC_PRESIGNED_UPLOAD_URL_ENDPOINT` defaults to `<base-url>/api/prescriptions/upload-url`

## Examples

- Local template: [`.env.local.example`](/C:/Users/user/OneDrive/바탕%20화면/project/mobile-expo/.env.local.example)
- Remote template: [`.env.remote.example`](/C:/Users/user/OneDrive/바탕%20화면/project/mobile-expo/.env.remote.example)

## Notes

- If the app is already running, restart Expo after switching env mode.
- Local mode is best when the phone and PC are on the same network.
- Remote mode is best when you already have a reachable HTTPS API domain.
