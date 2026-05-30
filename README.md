![tabby-life](https://github.com/user-attachments/assets/b0e4755f-e6c4-4193-ba99-03d89da4f994)

---

## Development setup

```
npm install
npm run sync
```

`npm run sync` builds the Vite bundle and copies it into the native Android/iOS projects. Run it again whenever you change web code before opening a native IDE.

---

## Building for Android

**Prerequisites:** [Android Studio](https://developer.android.com/studio) installed with the Android SDK.

```
npm run sync
npm run open:android
```

In Android Studio:
- **Run on device/emulator** — connect a device or start an emulator, then press the Run button.
- **Release build** — go to **Build → Generate Signed Bundle or APK**, create or select a keystore, and follow the prompts.

---

## Building for iOS

**Prerequisites:** Xcode installed (Mac only) with Command Line Tools (`xcode-select --install`).

```
npm run sync
npm run open:ios
```

In Xcode:
- Select your target device or simulator from the scheme menu and press **Run**.
- **Release build** — set the scheme to **Release**, then go to **Product → Archive** to produce an `.xcarchive` for App Store distribution.


© 2026 Khan. All Rights Reserved.
