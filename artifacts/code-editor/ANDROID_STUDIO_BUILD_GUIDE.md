# VS Code Mobile — Android Studio Build Guide

## Zaruri Cheezein (Requirements)
1. **Android Studio** — https://developer.android.com/studio
2. **Node.js 20+** — https://nodejs.org
3. **pnpm** — `npm install -g pnpm`
4. **Java 17** (Android Studio ke saath aata hai)

---

## Step 1: Dependencies Install Karo

Project folder mein jaao (jahan package.json hai):

```bash
# Root workspace mein
cd <project-root>
pnpm install
```

---

## Step 2: Android Studio Mein Open Karo

1. Android Studio open karo
2. **File → Open** click karo
3. `artifacts/code-editor/android/` folder select karo (woh folder jo `build.gradle` contain karta hai)
4. **OK** press karo — Gradle sync automatically shuru ho jayega
5. Sync complete hone ka intezaar karo (pehli baar time lagta hai)

---

## Step 3: Backend URL Set Karo

`artifacts/code-editor/.env` file banao:

```
EXPO_PUBLIC_DOMAIN=your-server-url-here
```

> Agar aap apna server use karna chahte hain to Express API deploy karo aur woh URL daalo.
> Local testing ke liye: `EXPO_PUBLIC_DOMAIN=localhost:8080`

---

## Step 4: APK Build Karo

### Option A — Android Studio se (Recommended)
1. **Build → Generate Signed Bundle / APK** click karo
2. **APK** select karo → **Next**
3. Key store ke liye debug key use karo:
   - Key store path: `android/app/debug.keystore`
   - Store password: `android`
   - Key alias: `androiddebugkey`
   - Key password: `android`
4. **Release** build variant select karo
5. **Finish** — APK ban jayegi!

### Option B — Command Line se
```bash
cd artifacts/code-editor/android
./gradlew assembleRelease
```
APK milegi: `android/app/build/outputs/apk/release/app-release.apk`

---

## Important Files

| File | Purpose |
|------|---------|
| `android/app/build.gradle` | App-level Gradle config, permissions, signing |
| `android/build.gradle` | Root Gradle config |
| `android/settings.gradle` | Project settings |
| `android/gradle.properties` | Gradle properties (Hermes, New Arch) |
| `android/app/src/main/AndroidManifest.xml` | All Android permissions |
| `android/app/debug.keystore` | Debug signing key |

---

## Permissions (Sab diye hue hain)
- INTERNET
- READ/WRITE_EXTERNAL_STORAGE
- MANAGE_EXTERNAL_STORAGE
- CAMERA
- FOREGROUND_SERVICE
- ACCESS_NETWORK_STATE
- VIBRATE

---

## App Features
- VS Code jaisi dark/transparent/light themes
- Python, JS, Java, Bash code editor with syntax highlighting
- Built-in terminal (code execute karo)
- GitHub integration (PAT se directly push)
- Projects AsyncStorage mein save (reboot ke baad bhi rehte hain)
- File explorer, multi-file support

---

## Agar Error Aaye

**"SDK location not found"**
→ `android/local.properties` mein ye add karo:
```
sdk.dir=/path/to/your/Android/Sdk
```
Windows: `sdk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk`

**"Node not found"**
→ Node.js install karo aur terminal restart karo

**Gradle sync fail ho**
→ File → Invalidate Caches → Restart Android Studio
