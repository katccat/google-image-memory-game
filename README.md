![Tabby](images/thumbnail.png)

---

## Development setup

```
npm install
npm run sync
```

`npm run sync` builds the Vite bundle and copies it into the native Android/iOS projects. Run it again whenever you change web code before opening a native IDE.

`npm run build` builds the Vite bundle only, without syncing to native projects. Good for deploying the web version.

`npx vite` serves the website over a dev server which can be edited live.

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

<br>
© 2026 Khan