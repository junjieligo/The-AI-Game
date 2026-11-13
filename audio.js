import { VOXCPM_RECORDINGS } from "./voxcpm-recordings.js?v=1.7";
import { GUIDE_RECORDINGS } from "./guide-lines.js?v=1.7";
import { ORDER_RECORDINGS } from "./order-recordings.js?v=1.7";
import { RECORDED_CLIPS } from "./recordings.js?v=1.7";
import { NAME_RECORDINGS, RETIRED_NAME_KEYS } from "./name-recordings.js?v=1.7";

// Retain existing human performances. Current Yu performances and previously
// uncovered authored cues come from the local batch; custom names use fallback.
export const AUDIO_CLIPS = {
  ...Object.fromEntries(
    Object.entries(RECORDED_CLIPS).filter(
      ([key]) => !RETIRED_NAME_KEYS.includes(key) && !key.startsWith("yu|"),
    ),
  ),
  ...NAME_RECORDINGS,
  ...GUIDE_RECORDINGS,
  ...ORDER_RECORDINGS,
  "traveller|十二元": RECORDED_CLIPS["narrator|十二元"],
  ...VOXCPM_RECORDINGS,
};

export const VOICE_PROFILES = Object.freeze({
  yu: Object.freeze({
    label: "Yu",
    direction: "Soft, gentle, playful and slightly shy",
    rate: 0.98,
    pitch: 1.03,
  }),
  server: Object.freeze({
    label: "Server",
    direction: "Calm and welcoming",
    rate: 1,
    pitch: 1,
  }),
  narrator: Object.freeze({
    label: "Narrator",
    direction: "Clear and natural",
    rate: 1,
    pitch: 1,
  }),
  traveller: Object.freeze({
    label: "Traveller",
    direction: "Friendly and assured",
    rate: 1,
    pitch: 1,
  }),
});

export function roleFromSpeaker(speaker = "") {
  const name = String(speaker).toLowerCase();
  if (/\byu\b/.test(name)) return "yu";
  if (/server|seller|neighbou?r/.test(name)) return "server";
  if (/travell?er|player|learner|宝玉|小李|小白/.test(name)) return "traveller";
  return "narrator";
}

function localClipURL(path) {
  if (typeof path !== "string" || !path.trim()) return null;
  const base = globalThis.document?.baseURI || globalThis.location?.href;
  if (!base) return null;
  try {
    const baseURL = new URL(base);
    const pageURL = new URL(globalThis.location?.href || base);
    const url = new URL(path, baseURL);
    // Refresh revised recordings when a returning player loads this release.
    url.searchParams.set("v", "1.7");
    if (url.username || url.password) return null;
    if (pageURL.protocol === "file:" && url.protocol === "file:" && !url.host)
      return url.href;
    if (
      ["http:", "https:"].includes(pageURL.protocol) &&
      url.protocol === pageURL.protocol &&
      url.origin === pageURL.origin
    )
      return url.href;
  } catch {
    /* Invalid or unsupported asset paths use the device fallback. */
  }
  return null;
}

function mandarinVoices(voices) {
  return voices
    .filter((voice) => {
      const lang = String(voice.lang || "")
        .toLowerCase()
        .replaceAll("_", "-");
      // localService excludes network-backed speech services. Do not substitute
      // an English or Cantonese voice when Mandarin is unavailable.
      if (voice.localService !== true || /(^zh-hk\b|\byue\b|\bhk\b)/.test(lang))
        return false;
      if (/cantonese|粵語|粤语|廣東話|广东话/i.test(voice.name || ""))
        return false;
      return (
        /^zh-(cn|sg|tw)(-|$)/.test(lang) ||
        /^zh-hans(-|$)/.test(lang) ||
        /^cmn(-|$)/.test(lang)
      );
    })
    .sort((a, b) => {
      // Quality names are only a preference signal, not a quality guarantee.
      // Keep one best local voice across roles instead of assigning a weaker
      // voice merely to make the cast sound different. Recorded cast voices
      // provide the intended character performances.
      const qualityRank = (voice) => {
        const identity = `${voice.name || ""} ${voice.voiceURI || ""}`;
        if (/premium|enhanced|natural|neural|高品质|高質量|高质量|增强|增強/i.test(identity))
          return 0;
        if (/compact|basic|低质量|低質量/i.test(identity)) return 2;
        return 1;
      };
      const languageRank = (voice) => {
        const lang = String(voice.lang).toLowerCase().replaceAll("_", "-");
        if (/^zh-cn\b|^zh-hans-cn\b|^cmn-.*\bcn\b|^cmn-cn\b/.test(lang))
          return 0;
        if (/^zh-hans\b/.test(lang)) return 1;
        if (/^zh-sg\b/.test(lang)) return 2;
        if (/^cmn\b/.test(lang)) return 3;
        return 4;
      };
      const preferredNameRank = (voice) =>
        /ting[\s-]?ting|婷婷/i.test(voice.name || "") ? 0 : 1;
      const priority =
        qualityRank(a) - qualityRank(b) ||
        languageRank(a) - languageRank(b) ||
        preferredNameRank(a) - preferredNameRank(b) ||
        Number(Boolean(b.default)) - Number(Boolean(a.default));
      if (priority) return priority;
      const aKey = `${a.lang}|${a.name}|${a.voiceURI}`;
      const bKey = `${b.lang}|${b.name}|${b.voiceURI}`;
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });
}

export function createVoicePlayer({
  onNotice = () => {},
  onState = () => {},
} = {}) {
  const synth = globalThis.speechSynthesis;
  let generation = 0;
  let currentAudio = null;
  let currentUtterance = null;
  let cancelVoiceWait = null;
  let startTimer = null;
  let speaking = false;
  let activeRole = null;
  let mode = "device";
  let voiceName = null;
  let voiceLanguage = null;

  const notice = (message) => {
    if (typeof onNotice === "function") onNotice(message);
  };
  const state = (role, value) => {
    speaking = value;
    activeRole = value ? role : null;
    if (typeof onState === "function") onState(role, value);
  };
  const clearStartTimer = () => {
    clearTimeout(startTimer);
    startTimer = null;
  };
  const availableVoices = () => {
    try {
      return Array.from(synth?.getVoices?.() || []);
    } catch {
      return [];
    }
  };
  const disposeAudio = () => {
    if (!currentAudio) return;
    const audio = currentAudio;
    currentAudio = null;
    audio.onplaying = audio.onended = audio.onerror = null;
    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {
      /* Some browsers can throw while an audio resource is loading. */
    }
  };

  function stop() {
    generation += 1;
    cancelVoiceWait?.();
    cancelVoiceWait = null;
    clearStartTimer();
    disposeAudio();
    if (currentUtterance) {
      currentUtterance.onstart =
        currentUtterance.onend =
        currentUtterance.onerror =
          null;
      currentUtterance = null;
    }
    try {
      synth?.cancel();
    } catch {
      /* Speech may be unavailable during page teardown. */
    }
    if (speaking && activeRole) state(activeRole, false);
  }

  function waitForVoices(token) {
    const voices = availableVoices();
    if (mandarinVoices(voices).length || !synth || token !== generation)
      return Promise.resolve(voices);
    return new Promise((resolve) => {
      let settled = false;
      let timeout;
      let poll;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        clearInterval(poll);
        synth.removeEventListener?.("voiceschanged", changed);
        if (cancelVoiceWait === cancel) cancelVoiceWait = null;
        resolve(result);
      };
      const changed = () => {
        const result = availableVoices();
        if (mandarinVoices(result).length) finish(result);
      };
      const cancel = () => finish([]);
      cancelVoiceWait = cancel;
      synth.addEventListener?.("voiceschanged", changed);
      if (!synth.addEventListener) poll = setInterval(changed, 50);
      timeout = setTimeout(() => finish(availableVoices()), 600);
      changed();
    });
  }

  async function playRecording(url, role, rate, token) {
    if (typeof globalThis.Audio !== "function") return "unavailable";
    let started = false;
    let finished = false;
    let failed = false;
    let audio;
    let timeout;
    try {
      audio = new globalThis.Audio(url);
      currentAudio = audio;
      audio.preload = "auto";
      audio.playbackRate = rate;
      audio.preservesPitch = true;
      // Older Safari versions expose only the prefixed property.
      if ("webkitPreservesPitch" in audio) audio.webkitPreservesPitch = true;
      audio.onplaying = () => {
        if (token !== generation || finished || started) return;
        started = true;
        mode = "recorded";
        voiceName = VOICE_PROFILES[role].label;
        voiceLanguage = "zh-CN";
        state(role, true);
      };
      const finish = () => {
        if (token !== generation || finished) return;
        finished = true;
        state(role, false);
        disposeAudio();
      };
      audio.onended = finish;
      audio.onerror = () => {
        failed = true;
        finish();
        if (started && token === generation)
          notice("This audio clip could not finish. Please try again.");
      };
      await Promise.race([
        audio.play(),
        new Promise((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error("Audio start timed out")),
            8000,
          );
        }),
      ]);
      if (token !== generation) return "cancelled";
      if (failed) return "unavailable";
      if (!finished) audio.onplaying?.();
      return "started";
    } catch (error) {
      if (token !== generation) return "cancelled";
      if (started) state(role, false);
      disposeAudio();
      return error?.name === "NotAllowedError" ? "blocked" : "unavailable";
    } finally {
      clearTimeout(timeout);
    }
  }

  async function play(text, { role = "yu", slow = false } = {}) {
    stop();
    const token = generation;
    const phrase = String(text ?? "").trim();
    if (!phrase) return false;
    voiceName = null;
    voiceLanguage = null;
    role = Object.hasOwn(VOICE_PROFILES, role) ? role : "narrator";
    const profile = VOICE_PROFILES[role];
    const clip = AUDIO_CLIPS[`${role}|${phrase}`];
    if (clip) {
      const slowURL = slow ? localClipURL(clip.slow) : null;
      const url = slowURL || localClipURL(clip.normal);
      if (url) {
        const result = await playRecording(
          url,
          role,
          slow && !slowURL ? 0.72 : 1,
          token,
        );
        if (result === "started") return true;
        if (result === "cancelled") return false;
        if (result === "blocked") {
          notice("Tap Listen again to allow audio playback.");
          return false;
        }
      }
      if (token !== generation) return false;
      notice("The recording is unavailable. Trying the device voice.");
    }

    mode = "device";
    if (!synth || typeof globalThis.SpeechSynthesisUtterance !== "function") {
      notice("Mandarin audio is not available in this browser.");
      return false;
    }
    const voices = mandarinVoices(await waitForVoices(token));
    if (token !== generation) return false;
    if (!voices.length) {
      notice(
        "No local Mandarin voice is available. Enable one in your device settings, then try again.",
      );
      return false;
    }
    const voice = voices[0];
    // Yu's name is pronounced 玉 (yù). Only change device speech input;
    // subtitles and the exact role/text recording lookup above stay intact.
    const spokenPhrase = phrase.replace(/\bYu\b/gi, "玉");
    const utterance = new globalThis.SpeechSynthesisUtterance(spokenPhrase);
    currentUtterance = utterance;
    utterance.voice = voice;
    utterance.lang = voice.lang || "zh-CN";
    utterance.rate = profile.rate * (slow ? 0.72 : 1);
    utterance.pitch = profile.pitch;
    utterance.volume = 1;
    voiceName = voice.name;
    voiceLanguage = utterance.lang;
    utterance.onstart = () => {
      if (token !== generation) return;
      clearStartTimer();
      state(role, true);
    };
    const finish = () => {
      if (token !== generation) return;
      clearStartTimer();
      currentUtterance = null;
      state(role, false);
    };
    utterance.onend = finish;
    utterance.onerror = (event) => {
      if (token !== generation) return;
      finish();
      if (!["canceled", "interrupted"].includes(event.error))
        notice("The Mandarin voice could not play. Please try again.");
    };
    try {
      startTimer = setTimeout(() => {
        if (token !== generation || speaking) return;
        stop();
        notice("Audio did not start. Tap Listen to try again.");
      }, 4000);
      synth.speak(utterance);
      return true;
    } catch {
      finish();
      notice("The Mandarin voice could not play. Please try again.");
      return false;
    }
  }

  function getStatus() {
    const clips = Object.values(AUDIO_CLIPS).filter(
      (clip) => clip && (localClipURL(clip.normal) || localClipURL(clip.slow)),
    );
    return {
      mode,
      hasRecordedClips: clips.length > 0,
      recordedClipCount: clips.length,
      speechSupported: Boolean(
        synth && typeof globalThis.SpeechSynthesisUtterance === "function",
      ),
      mandarinVoiceCount: mandarinVoices(availableVoices()).length,
      speaking,
      activeRole,
      voiceName,
      voiceLanguage,
    };
  }

  return { play, stop, getStatus };
}
