# Bolo! — iPhone app (Expo)

A thin native shell around the Bolo web app (`../hindi`, served at https://tutorwise.ca/hindi/). Lessons, cards and
accounts all come from the website, so content updates need no new app build. The shell adds what Safari can't do:

| Feature | How |
| --- | --- |
| Best Hindi voices (Enhanced / Premium) | `expo-speech`; the voice list is handed to the page before it loads (`window.BoloNative.voices`) |
| Hands-free practice with the screen locked | the page sends the whole lesson script (`hf-start`); `App.tsx` plays it with a silent looping `expo-audio` player holding the background audio session and the lock-screen controls |
| Daily reminder | `expo-notifications` daily trigger, set from Settings in the app |
| Movie clips autoplay with sound | WebView `mediaPlaybackRequiresUserAction={false}` |

Bridge: page → app with `window.ReactNativeWebView.postMessage(JSON)` (`say`, `stop`, `hf-start`, `hf-cmd`, `reminder`);
app → page with `window.BoloNative.receive(msg)` (`hf` events `show` / `xp` / `paused` / `end`, `reminder` result).
The web side is `NATIVE_BRIDGE` in `hindi/app.js`.

Progress in the app is separate from Safari's copy on the same phone — sign in to the same Bolo account in both.

## Build and ship (no Mac needed)

```bash
npm install
npx eas-cli@latest build --platform ios --profile production   # Expo's servers build and sign it
npx eas-cli@latest submit --platform ios --latest               # upload to App Store Connect → TestFlight
```

The first iOS build asks for the Apple developer login once to create the certificates.
Only native changes (this folder) need a new build; lesson changes go live from the website.
