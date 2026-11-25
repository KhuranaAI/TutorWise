/*
  Bolo! native shell
  ------------------
  The lessons are the Bolo web app (tutorwise.ca/hindi), shown full-screen in a WebView, so lesson updates reach
  the app without a new build. This shell adds what a web page can't do on an iPhone:

    • speech       — the phone's best Hindi and English voices (Enhanced / Premium), which Safari hides
    • hands-free   — the lesson script plays here (iOS pauses web pages in the background), keeps going with the
                     screen locked, listens to her answer with the mic (Apple speech recognition, Hindi), takes voice
                     commands ("repeat", "next", "pause"), and answers to lock-screen / AirPods / car buttons
    • haptics      — small taps for right / wrong answers and unlocks
    • reminders    — a daily nudge that skips days she has already practised and mentions her streak
    • offline      — tutorwise.ca is an app-bound domain, so the page's service worker can cache it

  Page → app: window.ReactNativeWebView.postMessage(JSON). App → page: window.BoloNative.receive(msg).
  The web side is NATIVE_BRIDGE in hindi/app.js.
*/
import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as Speech from "expo-speech";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import * as SplashScreen from "expo-splash-screen";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { createAudioPlaylist, setAudioModeAsync, type AudioPlaylist } from "expo-audio";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

const APP_URL = "https://tutorwise.ca/hindi/";
const HOME_HOST = "tutorwise.ca";

SplashScreen.preventAutoHideAsync().catch(() => {});
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

type Part =
  | { t: "en" | "hi"; s: string; rate?: number }
  | { t: "wait"; ms: number }
  | { t: "show"; v: string[] }
  | { t: "listen"; ms: number; deva: string; key: string };
type HFStep = { parts: Part[]; xp?: boolean };
type NativeVoice = { identifier: string; name: string; quality: string; language: string };

// Rank voices: Premium > Enhanced > the rest (iPhones put the quality in the identifier).
const voiceScore = (v: NativeVoice) => {
  const t = (v.name + " " + v.identifier).toLowerCase();
  return (/premium/.test(t) ? 8 : 0) + (v.quality === "Enhanced" || /enhanced/.test(t) ? 6 : 0) + (/siri/.test(t) ? 5 : 0) + (/compact/.test(t) ? -4 : 0);
};

/* ---------- checking what she said (Hindi recogniser → Devanagari) ---------- */
const clean = (s: string) => s.normalize("NFC").replace(/[।.,!?;:"“”'‘’()\-]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
const lev = (a: string, b: string) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
// Every word must be there. Short words must match exactly, because they carry the grammar (rahi / rahe, hoon / ho).
function grade(heard: string[], expected: string): "right" | "close" | "wrong" {
  const want = clean(expected).split(" ").filter(Boolean);
  let best = 0;
  for (const h of heard) {
    const got = clean(h).split(" ").filter(Boolean);
    const hit = want.filter((w) => got.some((g) => g === w || ([...w].length >= 4 && lev(g, w) <= 1))).length;
    best = Math.max(best, hit / Math.max(1, want.length));
  }
  return best === 1 ? "right" : best >= 0.6 ? "close" : "wrong";
}
const COMMANDS: [RegExp, "repeat" | "skip" | "pause"][] = [
  [/repeat|रिपीट|दोबारा|फिर से|again/i, "repeat"],
  [/next|skip|नेक्स्ट|स्किप|अगला/i, "skip"],
  [/pause|stop|पॉज़|पॉज|रुको|स्टॉप/i, "pause"],
];

export default function App() {
  const web = useRef<ComponentRef<typeof WebView>>(null);
  const [voices, setVoices] = useState<NativeVoice[] | null>(null);
  const [offline, setOffline] = useState(false);
  const hf = useRef({ running: false, paused: false, gen: 0, steps: [] as HFStep[], pos: 0, t0: 0, limitMs: 0, hiVoice: "", enVoice: "", mic: false, results: [] as { key: string; ok: boolean }[] });
  const keepAlive = useRef<AudioPlaylist | null>(null);
  const listenStop = useRef<(() => void) | null>(null);

  // Voices first: they are handed to the page before it loads, so the lessons can use them straight away.
  useEffect(() => {
    let alive = true;
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "mixWithOthers" }).catch(() => {});
    const load = async (tries: number) => {
      let vs: NativeVoice[] = [];
      try { vs = (await Speech.getAvailableVoicesAsync()) as NativeVoice[]; } catch { vs = []; }
      if (!vs.length && tries > 0) return setTimeout(() => load(tries - 1), 400); // iOS fills the list a moment after launch
      if (alive) setVoices(vs.filter((v) => /^(hi|en)([-_]|$)/i.test(v.language)));
    };
    load(5);
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 9000); // never stay on the splash forever
    return () => { alive = false; clearTimeout(t); };
  }, []);

  const send = useCallback((msg: object) => {
    web.current?.injectJavaScript(`window.BoloNative && window.BoloNative.receive(${JSON.stringify(msg)}); true;`);
  }, []);

  const say = useCallback((text: string, lang: "hi" | "en", voice?: string, rate?: number) =>
    new Promise<void>((done) => {
      let finished = false;
      const fin = () => { if (!finished) { finished = true; clearTimeout(timer); done(); } };
      const timer = setTimeout(fin, 3000 + text.length * 120);
      const best = (voices || []).filter((v) => v.language.toLowerCase().startsWith(lang)).sort((a, b) => voiceScore(b) - voiceScore(a))[0];
      Speech.speak(text, {
        language: lang === "hi" ? "hi-IN" : "en-US",
        voice: voice || best?.identifier,
        rate: rate ?? (lang === "hi" ? 0.85 : 1),
        useApplicationAudioSession: true,
        onDone: fin, onStopped: fin, onError: fin,
      });
    }), [voices]);

  // Listen for up to `ms`; resolves with everything the recogniser heard ([] = nothing).
  const listen = useCallback((ms: number, hint: string) =>
    new Promise<string[]>((resolve) => {
      const heard: string[] = [];
      const subs: { remove: () => void }[] = [];
      let over = false;
      const finish = () => {
        if (over) return; over = true;
        clearTimeout(timer); listenStop.current = null;
        subs.forEach((s) => s.remove());
        try { ExpoSpeechRecognitionModule.abort(); } catch {}
        resolve(heard);
      };
      const timer = setTimeout(finish, ms + 1500);
      listenStop.current = finish;
      subs.push(ExpoSpeechRecognitionModule.addListener("result", (e) => {
        e.results.forEach((r) => r.transcript && heard.push(r.transcript));
        if (e.isFinal) finish();
      }));
      subs.push(ExpoSpeechRecognitionModule.addListener("error", finish));
      subs.push(ExpoSpeechRecognitionModule.addListener("end", finish));
      try {
        ExpoSpeechRecognitionModule.start({
          lang: "hi-IN", interimResults: false, maxAlternatives: 3, continuous: false, contextualStrings: hint.split(/\s+/).slice(0, 20),
          iosCategory: { category: "playAndRecord", categoryOptions: ["defaultToSpeaker", "allowBluetooth", "allowBluetoothA2DP"], mode: "default" },
        });
      } catch { finish(); }
    }), []);

  /* ---------- hands-free: runs the lesson script here so it keeps going with the screen locked ---------- */
  const hfRun = useCallback(async () => {
    const s = hf.current;
    const g = ++s.gen;
    const wait = (ms: number) => new Promise<boolean>((r) => setTimeout(() => r(g === s.gen), ms));
    while (s.running && !s.paused && g === s.gen) {
      if (s.limitMs && Date.now() - s.t0 > s.limitMs) return hfStop(true);
      if (s.pos >= s.steps.length) s.pos = 0;
      const step = s.steps[s.pos];
      send({ type: "hf", ev: "step", i: s.pos });
      for (const p of step.parts) {
        if (g !== s.gen) return;
        if (p.t === "show") send({ type: "hf", ev: "show", v: p.v });
        else if (p.t === "wait") { if (!(await wait(p.ms))) return; }
        else if (p.t === "listen") {
          if (!s.mic) { if (!(await wait(p.ms))) return; continue; }
          const heard = await listen(p.ms, p.deva);
          if (g !== s.gen) return;
          const cmd = COMMANDS.find(([re]) => heard.some((h) => re.test(h) && h.split(/\s+/).length <= 3));
          if (cmd) { hfCommand(cmd[1]); return; }
          if (!heard.length) continue; // nothing heard: just play the answer, as without the mic
          const v = grade(heard, p.deva);
          s.results.push({ key: p.key, ok: v === "right" });
          send({ type: "hf", ev: "heard", text: heard[0], verdict: v });
          if (v === "right") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          await say(v === "right" ? pickOne(["Correct!", "Yes! Well done.", "Perfect."]) : v === "close" ? "Almost! Listen:" : "Not quite. Listen:", "en", s.enVoice);
        }
        else await say(p.s, p.t, p.t === "hi" ? s.hiVoice : s.enVoice, p.rate);
      }
      if (g !== s.gen) return;
      if (step.xp) send({ type: "hf", ev: "xp" });
      s.pos++;
    }
  }, [say, send, listen]);

  const hfPause = useCallback((on: boolean) => {
    const s = hf.current;
    if (!s.running || s.paused === on) return;
    s.paused = on; s.gen++;
    listenStop.current?.();
    Speech.stop();
    send({ type: "hf", ev: "paused", on });
    if (!on) { keepAlive.current?.play(); hfRun(); } else keepAlive.current?.pause();
  }, [hfRun, send]);

  const hfCommand = useCallback((cmd: "repeat" | "skip" | "pause" | "play") => {
    const s = hf.current;
    if (!s.running) return;
    if (cmd === "pause") return hfPause(true);
    if (cmd === "play") return hfPause(false);
    if (cmd === "skip") s.pos++;
    s.paused = false; s.gen++;
    listenStop.current?.();
    Speech.stop(); keepAlive.current?.play();
    send({ type: "hf", ev: "paused", on: false });
    hfRun();
  }, [hfPause, hfRun, send]);

  const hfStop = useCallback((timeUp?: boolean) => {
    const s = hf.current;
    if (!s.running) return;
    s.running = false; s.gen++;
    listenStop.current?.();
    Speech.stop();
    try { keepAlive.current?.setActiveForLockScreen(false); keepAlive.current?.pause(); keepAlive.current?.release(); } catch {}
    keepAlive.current = null;
    deactivateKeepAwake("hf").catch(() => {});
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "mixWithOthers", allowsRecording: false }).catch(() => {});
    send({ type: "hf", ev: "end", timeUp: !!timeUp, results: s.results });
  }, [send]);

  const hfStart = useCallback(async (msg: any) => {
    const s = hf.current;
    if (s.running) hfStop();
    Object.assign(s, { running: true, paused: false, steps: msg.steps || [], pos: 0, t0: Date.now(), limitMs: msg.limitMs || 0,
      hiVoice: msg.hiVoice || "", enVoice: msg.enVoice || "", mic: false, results: [] });
    if (msg.mic) {
      try {
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        s.mic = !!perm.granted && ExpoSpeechRecognitionModule.isRecognitionAvailable();
      } catch { s.mic = false; }
      send({ type: "hf", ev: "mic", ok: s.mic });
    }
    try {
      // Keeps playing with the screen locked. A tiny silent playlist holds the audio session and gives the lock screen,
      // AirPods and car buttons play / pause and ⏮ / ⏭ (previous = repeat, next = skip).
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix", allowsRecording: s.mic });
      const silence = require("./assets/silence.wav");
      const p = createAudioPlaylist({ sources: [silence, silence, silence], loop: "single", updateInterval: 500 });
      p.volume = 0.05;
      p.skipTo(1);
      p.addListener("trackChanged", (d) => {
        if (!hf.current.running || d.currentIndex === 1) return;
        const cmd = d.currentIndex > 1 || (d.currentIndex === 0 && d.previousIndex === 2) ? "skip" : "repeat";
        p.skipTo(1);
        hfCommand(cmd);
      });
      p.addListener("playlistStatusUpdate", (st) => {
        if (!hf.current.running) return;
        if (!st.playing && !hf.current.paused) hfPause(true);
        else if (st.playing && hf.current.paused) hfPause(false);
      });
      p.play();
      p.setActiveForLockScreen(true, { title: "Hands-free Hindi", artist: "Bolo!" }, { showNextTrack: true, showPreviousTrack: true });
      keepAlive.current = p;
    } catch {}
    activateKeepAwakeAsync("hf").catch(() => {});
    await say("Hands-free Hindi. Ready? Let's go!", "en", s.enVoice);
    if (s.running && !s.paused) hfRun();
  }, [hfCommand, hfPause, hfRun, hfStop, say, send]);

  /* ---------- reminders: the next 7 days at her time, skipping today if she has already practised ---------- */
  const reminder = useCallback(async (msg: any) => {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    if (!msg.on) return send({ type: "reminder", ok: true, on: false });
    const perm = await Notifications.requestPermissionsAsync().catch(() => null);
    if (!perm || !perm.granted) return send({ type: "reminder", ok: false });
    const now = new Date();
    for (let d = 0; d < 7; d++) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, msg.hour, msg.minute || 0);
      if (at <= now || (d === 0 && msg.doneToday)) continue;
      const streak = d === 0 ? msg.streak : d === 1 && msg.doneToday ? msg.streak : 0;
      const body = streak > 0 ? `Your ${streak}-day 🔥 streak ends at midnight — 5 minutes of Hindi?` : `Time for a little Hindi, ${msg.name || "friend"}! 🇮🇳`;
      await Notifications.scheduleNotificationAsync({
        content: { title: "Bolo! 🔥", body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      }).catch(() => {});
    }
    send({ type: "reminder", ok: true, on: true });
  }, [send]);

  const haptic = useCallback((kind: string) => {
    const N = Haptics.NotificationFeedbackType;
    const p = kind === "success" ? Haptics.notificationAsync(N.Success)
      : kind === "error" ? Haptics.notificationAsync(N.Error)
      : kind === "warning" ? Haptics.notificationAsync(N.Warning)
      : kind === "heavy" ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      : Haptics.selectionAsync();
    p.catch(() => {});
  }, []);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    let msg: any;
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    switch (msg.type) {
      case "say": Speech.stop(); say(msg.text, msg.lang === "en" ? "en" : "hi", msg.voice, msg.rate); break;
      case "stop": Speech.stop(); break;
      case "haptic": haptic(msg.kind); break;
      case "hf-start": hfStart(msg); break;
      case "hf-cmd": if (msg.cmd === "stop") hfStop(); else hfCommand(msg.cmd); break;
      case "reminder": reminder(msg); break;
      case "listen": (async () => { // the 🎤 in Speak It lessons
        try {
          const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          if (!perm.granted) return send({ type: "heard", id: msg.id, error: "not-allowed" });
          Speech.stop();
          if (!hf.current.running) await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "mixWithOthers", allowsRecording: true });
          const texts = await listen(msg.ms || 6000, msg.hint || "");
          if (!hf.current.running) await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "mixWithOthers", allowsRecording: false });
          send({ type: "heard", id: msg.id, texts });
        } catch { send({ type: "heard", id: msg.id, error: "unavailable" }); }
      })(); break;
      case "listen-stop": listenStop.current?.(); break;
    }
  }, [say, haptic, hfStart, hfStop, hfCommand, reminder, listen, send]);

  // Links that leave Bolo (YouTube "open", share links) open in the phone's browser / apps.
  const onNav = useCallback((req: { url: string; isTopFrame?: boolean }) => {
    if (req.isTopFrame === false) return true; // embedded clips and sign-in frames load inside the page
    try {
      const u = new URL(req.url);
      if (u.protocol === "about:" || u.protocol === "blob:" || u.protocol === "data:") return true;
      if (u.hostname === HOME_HOST || u.hostname.endsWith("." + HOME_HOST)) return true;
    } catch { return true; }
    Linking.openURL(req.url).catch(() => {});
    return false;
  }, []);

  if (!voices) return <View style={styles.boot}><ActivityIndicator color="#ffffff" /></View>;

  if (offline) return (
    <View style={styles.boot}>
      <Text style={styles.offTitle}>You're offline</Text>
      <Text style={styles.offText}>Bolo needs the internet the first time it opens. After that it works offline.</Text>
      <Pressable style={styles.offBtn} onPress={() => setOffline(false)}><Text style={styles.offBtnText}>Try again</Text></Pressable>
    </View>
  );

  const hasHi = voices.some((v) => v.language.toLowerCase().startsWith("hi"));
  const boot = `window.BoloNative = { platform: ${JSON.stringify(Platform.OS)}, version: 2, voices: ${JSON.stringify(voices)},
    features: { mic: true, hiVoice: ${hasHi}, haptics: true, lockscreenSkip: true, smartReminder: true }, inbox: [], receive: function (m) { this.inbox.push(m); } }; true;`;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WebView
        ref={web}
        source={{ uri: APP_URL }}
        style={styles.web}
        injectedJavaScriptBeforeContentLoaded={boot}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onNav}
        onLoadEnd={() => SplashScreen.hideAsync().catch(() => {})}
        onError={() => { SplashScreen.hideAsync().catch(() => {}); setOffline(true); }}
        limitsNavigationsToAppBoundDomains
        applicationNameForUserAgent="BoloApp/2"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        allowsBackForwardNavigationGestures={false}
        bounces={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically
        sharedCookiesEnabled
        pullToRefreshEnabled={false}
        onContentProcessDidTerminate={() => web.current?.reload()}
      />
    </View>
  );
}

function pickOne<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff6ea" },
  web: { flex: 1, backgroundColor: "#fff6ea" },
  boot: { ...StyleSheet.absoluteFill, backgroundColor: "#2a9d8f", alignItems: "center", justifyContent: "center", padding: 32 },
  offTitle: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 10 },
  offText: { color: "#e6fffb", fontSize: 16, textAlign: "center", marginBottom: 24 },
  offBtn: { backgroundColor: "#fff", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  offBtnText: { color: "#1d7a6e", fontSize: 17, fontWeight: "800" },
});
