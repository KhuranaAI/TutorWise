# Bolo! — iPhone app (Expo)

A thin native shell around the Bolo web app (`../hindi`, served at https://tutorwise.ca/hindi/). Lessons, cards and
accounts all come from the website, so content updates need no new app build. The shell adds what Safari can't do:

| Feature | How |
| --- | --- |
| Best Hindi and English voices (Enhanced / Premium) | `expo-speech`; the voice list is handed to the page before it loads (`window.BoloNative.voices`) |
| Hands-free with the screen locked | the page sends the whole lesson script (`hf-start`); `App.tsx` plays it, with a silent `expo-audio` playlist holding the background audio session |
| Mic in hands-free + voice commands | `expo-speech-recognition` (hi-IN): a `listen` part grades her answer word by word (short words must match exactly — rahi ≠ rahe); “repeat / next / pause” work too |
| Mic in Speak It lessons | the page's `NativeRec` shim sends `listen`; the app answers with `heard` and the page's own checker grades it |
| Lock screen / AirPods / car | play-pause, ⏭ = skip, ⏮ = repeat (the silent playlist's track changes) |
| Haptics | `expo-haptics`, from the page's sound effects (`haptic`) |
| Smarter daily reminder | `expo-notifications` date triggers for the next 7 days, skipping today once the goal is met, with the streak in the text |
| Offline | `tutorwise.ca` is an app-bound domain (`WKAppBoundDomains`), so the page's service worker caches it |
| Movie clips autoplay with sound | WebView `mediaPlaybackRequiresUserAction={false}` |

Bridge: page → app with `window.ReactNativeWebView.postMessage(JSON)` (`say`, `stop`, `haptic`, `listen`, `hf-start`, `hf-cmd`,
`reminder`); app → page with `window.BoloNative.receive(msg)` (`hf` events `show` / `xp` / `heard` / `mic` / `paused` / `end`,
`heard`, `reminder` result). Builds from a session: `EXPO_TOKEN` (personal-account token) + `eas build --auto-submit`.
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
