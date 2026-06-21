# GitHub Actions — VS Code Mobile APK Builder

## APK Kaise Milegi

1. Ye project GitHub pe push karo
2. **Actions** tab pe jao
3. **Build Android APK** workflow chale ga automatically
4. Build complete hone ke baad → **Artifacts** section mein **VSCodeMobile-APK** download karo

---

## Secrets (Optional — Release Signing ke liye)

Agar signed APK chahiye (Google Play ke liye), to repo Settings → Secrets → Actions mein ye daalo:

| Secret Name | Value |
|------------|-------|
| `ANDROID_SIGNING_KEY` | Base64 encoded keystore file |
| `ANDROID_KEY_ALIAS` | Key alias (e.g. `my-key-alias`) |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_PASSWORD` | Key password |

**Bina secrets ke bhi APK banegi** — debug keystore se sign hogi (testing ke liye bilkul theek hai).

### Keystore Base64 kaise banayein:
```bash
# Linux/Mac
base64 -i my-keystore.jks -o keystore-base64.txt

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("my-keystore.jks")) | Out-File keystore-base64.txt
```

---

## Triggers

- **Automatic**: `main` ya `master` branch pe push karne par
- **Manual**: Actions tab → "Build Android APK" → "Run workflow"
- **PR**: Pull request open hone par

---

## Build Time

~15-25 minutes (pehli baar ~30 min Gradle download ke liye)
