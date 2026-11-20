/*
  Bolo! native shell
  ------------------
  The lessons are the Bolo web app (tutorwise.ca/hindi), shown full-screen in a WebView, so every lesson
  update reaches the app without a new build. This shell adds what a web page can't do on an iPhone:

    • speech  — the phone's best Hindi voices (Enhanced / Premium), which Safari hides from web pages
    • hands-free practice that keeps talking with the screen locked (the lesson script runs here, not in
      the WebView, because iOS pauses web pages in the background)
    • lock-screen / car / AirPods play-pause for hands-free
    • a daily reminder notification

  The web app talks to this file through window.ReactNativeWebView.postMessage(JSON) and listens on
  window.BoloNative.receive(msg). See NATIVE_BRIDGE in hindi/app.js for the web side.
*/
import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as Speech from "expo-speech";
import * as Notifications from "expo-notifications";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

const APP_URL = "https://tutorwise.ca/hindi/";
const HOME_HOST = "tutorwise.ca";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

type Part = { t: "en" | "hi"; s: string; rate?: number } | { t: "wait"; ms: number } | { t: "show"; v: string[] };
type HFStep = { parts: Part[]; xp?: boolean };
type NativeVoice = { identifier: string; name: string; quality: string; language: string };

// Rank voices: Premium > Enhanced > the rest (iPhones put the quality in the identifier).
const voiceScore = (v: NativeVoice) => {
  const t = (v.name + " " + v.identifier).toLowerCase();
  return (/premium/.test(t) ? 8 : 0) + (v.quality === "Enhanced" || /enhanced/.test(t) ? 6 : 0) + (/siri/.test(t) ? 5 : 0) + (/compact/.test(t) ? -4 : 0);
};

export default function App() {
  const web = useRef<ComponentRef<typeof WebView>>(null);
  const [voices, setVoices] = useState<NativeVoice[] | null>(null);
  const hf = useRef({ running: false, paused: false, gen: 0, steps: [] as HFStep[], pos: 0, t0: 0, limitMs: 0, hiVoice: "", enVoice: "" });
  const keepAlive = useRef<AudioPlayer | null>(null);

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
    return () => { alive = false; };
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
        else await say(p.s, p.t, p.t === "hi" ? s.hiVoice : s.enVoice, p.rate);
      }
      if (g !== s.gen) return;
      if (step.xp) send({ type: "hf", ev: "xp" });
      s.pos++;
    }
  }, [say, send]);

  const hfPause = useCallback((on: boolean) => {
    const s = hf.current;
    if (!s.running || s.paused === on) return;
    s.paused = on;
    s.gen++;
    Speech.stop();
    send({ type: "hf", ev: "paused", on });
    if (!on) { keepAlive.current?.play(); hfRun(); } else keepAlive.current?.pause();
  }, [hfRun, send]);

  const hfStop = useCallback((timeUp?: boolean) => {
    const s = hf.current;
    if (!s.running) return;
    s.running = false; s.gen++;
    Speech.stop();
    try { keepAlive.current?.setActiveForLockScreen(false); keepAlive.current?.pause(); keepAlive.current?.remove(); } catch {}
    keepAlive.current = null;
    deactivateKeepAwake("hf").catch(() => {});
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "mixWithOthers" }).catch(() => {});
    send({ type: "hf", ev: "end", timeUp: !!timeUp });
  }, [send]);

  const hfStart = useCallback(async (msg: any) => {
    const s = hf.current;
    if (s.running) hfStop();
    Object.assign(s, { running: true, paused: false, steps: msg.steps || [], pos: 0, t0: Date.now(), limitMs: msg.limitMs || 0, hiVoice: msg.hiVoice || "", enVoice: "" });
    try {
      // The lesson keeps playing with the screen locked; a silent loop holds the audio session and the lock-screen controls.
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" });
      const p = createAudioPlayer(require("./assets/silence.wav"));
      p.loop = true; p.volume = 0.05;
      p.addListener("playbackStatusUpdate", (st) => { // lock screen / car / AirPods play-pause
        if (!hf.current.running) return;
        if (!st.playing && !hf.current.paused && st.isLoaded && st.playbackState !== "buffering") hfPause(true);
        else if (st.playing && hf.current.paused) hfPause(false);
      });
      p.play();
      p.setActiveForLockScreen(true, { title: "Hands-free Hindi", artist: (msg.name || "Bolo") + "'s lesson" });
      keepAlive.current = p;
    } catch {}
    activateKeepAwakeAsync("hf").catch(() => {});
    hfRun();
  }, [hfPause, hfRun, hfStop]);

  /* ---------- daily reminder ---------- */
  const reminder = useCallback(async (msg: any) => {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    if (!msg.on) return send({ type: "reminder", ok: true, on: false });
    const perm = await Notifications.requestPermissionsAsync().catch(() => null);
    if (!perm || !perm.granted) return send({ type: "reminder", ok: false });
    await Notifications.scheduleNotificationAsync({
      content: { title: "Bolo! 🔥", body: msg.body || "Time for a little Hindi!" },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: msg.hour, minute: msg.minute },
    });
    send({ type: "reminder", ok: true, on: true });
  }, [send]);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    let msg: any;
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    switch (msg.type) {
      case "say": Speech.stop(); say(msg.text, msg.lang === "en" ? "en" : "hi", msg.voice, msg.rate); break;
      case "stop": Speech.stop(); break;
      case "hf-start": hfStart(msg); break;
      case "hf-cmd":
        if (msg.cmd === "pause") hfPause(true);
        else if (msg.cmd === "play") hfPause(false);
        else if (msg.cmd === "stop") hfStop();
        else if (msg.cmd === "skip" || msg.cmd === "repeat") {
          const s = hf.current;
          if (!s.running) break;
          if (msg.cmd === "skip") s.pos++;
          s.paused = false; s.gen++; Speech.stop(); keepAlive.current?.play();
          send({ type: "hf", ev: "paused", on: false });
          hfRun();
        }
        break;
      case "reminder": reminder(msg); break;
    }
  }, [say, hfStart, hfPause, hfStop, hfRun, reminder, send]);

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

  const boot = `window.BoloNative = { platform: ${JSON.stringify(Platform.OS)}, version: 1, voices: ${JSON.stringify(voices)}, inbox: [], receive: function (m) { this.inbox.push(m); } }; true;`;

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
        applicationNameForUserAgent="BoloApp/1"
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
        startInLoadingState
        renderLoading={() => <View style={styles.boot}><ActivityIndicator color="#ffffff" /></View>}
        onContentProcessDidTerminate={() => web.current?.reload()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff6ea" },
  web: { flex: 1, backgroundColor: "#fff6ea" },
  boot: { ...StyleSheet.absoluteFill, backgroundColor: "#2a9d8f", alignItems: "center", justifyContent: "center" },
});
