// Local, optional voice practice. No upload, recognition or pronunciation score.
export const MAX_RECORDING_SECONDS = 15;
export const MIN_RECORDING_SECONDS = 0.8;
const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function defaultEnvironment() {
  return {
    mediaDevices: globalThis.navigator?.mediaDevices,
    MediaRecorder: globalThis.MediaRecorder,
    Blob: globalThis.Blob,
    URL: globalThis.URL,
    now: () => globalThis.performance.now(),
    setTimeout: (...args) => globalThis.setTimeout(...args),
    clearTimeout: (id) => globalThis.clearTimeout(id),
    setInterval: (...args) => globalThis.setInterval(...args),
    clearInterval: (id) => globalThis.clearInterval(id),
    isSecureContext: globalThis.isSecureContext !== false,
    isHidden: () => globalThis.document?.hidden === true,
  };
}

export function recordingExtension(mimeType = "") {
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

// Dependencies are injectable for lifecycle checks; production uses browser APIs.
export function createPracticeRecorder({
  onChange = () => {},
  onBeforeRecord = () => {},
  environment = {},
} = {}) {
  const env = { ...defaultEnvironment(), ...environment };
  let alive = true,
    generation = 0,
    stream = null,
    recorder = null,
    stopTimer = null,
    tickTimer = null,
    finaliseTimer = null,
    beganAt = 0;
  let current = {
    status: "idle",
    ready: false,
    method: null,
    seconds: 0,
    url: null,
    mimeType: "",
    message: "Say the sentence in your own voice.",
  };
  const snapshot = () => ({ ...current });
  const emit = (changes) => {
    current = { ...current, ...changes };
    if (alive) onChange(snapshot());
  };
  const stopTracks = (value) => {
    for (const track of value?.getTracks?.() || []) {
      try {
        track.stop();
      } catch {
        // Continue releasing the remaining tracks even if one was already ended.
      }
    }
  };
  const clearTimers = () => {
    env.clearTimeout(stopTimer);
    env.clearTimeout(finaliseTimer);
    env.clearInterval(tickTimer);
    stopTimer = finaliseTimer = tickTimer = null;
  };
  const releaseClip = () => {
    if (current.url) env.URL.revokeObjectURL(current.url);
    current.url = null;
  };
  const releaseCapture = () => {
    clearTimers();
    if (recorder) {
      recorder.ondataavailable = recorder.onstop = recorder.onerror = null;
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        // A disconnected microphone may already have ended its recorder.
      }
    }
    recorder = null;
    stopTracks(stream);
    stream = null;
  };
  function fail(message) {
    generation++;
    releaseCapture();
    releaseClip();
    emit({ status: "error", ready: false, method: null, seconds: 0, message });
  }

  async function start() {
    if (
      !alive ||
      ["requesting", "recording", "stopping"].includes(current.status)
    )
      return;
    generation++;
    const token = generation;
    releaseCapture();
    releaseClip();
    onBeforeRecord();
    emit({
      status: "requesting",
      ready: false,
      method: null,
      seconds: 0,
      mimeType: "",
      message: "Allow microphone access to record.",
    });
    if (
      !env.isSecureContext ||
      !env.mediaDevices?.getUserMedia ||
      !env.MediaRecorder
    ) {
      fail("Recording is unavailable here. You can still practise aloud.");
      return;
    }
    try {
      const granted = await env.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      // Closing the activity while its permission prompt is open must never leak
      // a late stream or restore a recording in a different lesson.
      if (!alive || token !== generation || env.isHidden()) {
        stopTracks(granted);
        if (alive && token === generation) cancel();
        return;
      }
      stream = granted;
      const tracks = stream.getAudioTracks?.() || stream.getTracks?.() || [];
      if (!tracks.some((track) => track.readyState !== "ended")) {
        fail("No microphone was found. Try again, or practise aloud.");
        return;
      }
      const mimeType = MIME_TYPES.find((type) =>
        env.MediaRecorder.isTypeSupported?.(type),
      );
      try {
        recorder = mimeType
          ? new env.MediaRecorder(stream, { mimeType })
          : new env.MediaRecorder(stream);
      } catch (error) {
        if (!mimeType) throw error;
        // Some Safari versions advertise a codec but require the default format.
        recorder = new env.MediaRecorder(stream);
      }
      const activeRecorder = recorder,
        chunks = [];
      let stoppedSeconds = null;
      activeRecorder.ondataavailable = (event) => {
        if (alive && token === generation && event.data?.size > 0)
          chunks.push(event.data);
      };
      activeRecorder.onerror = () => {
        if (alive && token === generation)
          fail("The recording stopped. Try again, or practise aloud.");
      };
      activeRecorder.onstop = () => {
        if (!alive || token !== generation) return;
        const seconds =
          stoppedSeconds ??
          Math.min(MAX_RECORDING_SECONDS, (env.now() - beganAt) / 1000);
        const type = activeRecorder.mimeType || chunks[0]?.type || "audio/webm";
        releaseCapture();
        if (seconds < MIN_RECORDING_SECONDS || !chunks.length) {
          fail("Try once more and say the whole sentence.");
          return;
        }
        const blob = new env.Blob(chunks, { type });
        if (!blob.size) {
          fail("No audio was captured. Try again, or practise aloud.");
          return;
        }
        emit({
          status: "ready",
          ready: true,
          method: "recorded",
          seconds,
          mimeType: type,
          url: env.URL.createObjectURL(blob),
          message: "Your voice, your Mandarin! Play it back.",
        });
      };
      // Capture the exact stop time independently of the asynchronously emitted
      // final data chunk. The recorder may also stop itself if a device disconnects.
      activeRecorder.stopPractice = () => {
        if (!alive || token !== generation || current.status !== "recording")
          return;
        stoppedSeconds = Math.min(
          MAX_RECORDING_SECONDS,
          Math.max(0, (env.now() - beganAt) / 1000),
        );
        env.clearTimeout(stopTimer);
        env.clearInterval(tickTimer);
        emit({
          status: "stopping",
          seconds: stoppedSeconds,
          message: "Finishing your recording…",
        });
        finaliseTimer = env.setTimeout(() => {
          if (alive && token === generation)
            fail(
              "The recording could not finish. Try again, or practise aloud.",
            );
        }, 2500);
        try {
          activeRecorder.stop();
          stopTracks(stream);
        } catch {
          fail("The recording stopped. Try again, or practise aloud.");
        }
      };
      beganAt = env.now();
      activeRecorder.start();
      emit({ status: "recording", seconds: 0, message: "Recording…" });
      stopTimer = env.setTimeout(() => stop(), MAX_RECORDING_SECONDS * 1000);
      tickTimer = env.setInterval(() => {
        if (alive && token === generation && current.status === "recording")
          emit({
            seconds: Math.min(
              MAX_RECORDING_SECONDS,
              Math.max(0, (env.now() - beganAt) / 1000),
            ),
          });
      }, 100);
    } catch (error) {
      if (!alive || token !== generation) return;
      const message = /NotAllowed|Security/.test(error?.name || "")
        ? "Microphone access was blocked. Try again, or practise aloud."
        : /NotFound|DevicesNotFound/.test(error?.name || "")
          ? "No microphone was found. Try again, or practise aloud."
          : "The microphone is unavailable. Try again, or practise aloud.";
      fail(message);
    }
  }
  function stop() {
    recorder?.stopPractice?.();
  }
  function cancel() {
    if (
      !alive ||
      !["requesting", "recording", "stopping"].includes(current.status)
    )
      return;
    generation++;
    releaseCapture();
    emit({
      status: "idle",
      ready: false,
      method: null,
      seconds: 0,
      message: "Recording paused. Tap Record when you’re ready.",
    });
  }
  function practiseAloud() {
    if (!alive) return;
    generation++;
    releaseCapture();
    releaseClip();
    emit({
      status: "manual",
      ready: false,
      method: null,
      seconds: 0,
      message: "Say the sentence aloud, then tap I’ve said it.",
    });
  }
  function confirmAloud() {
    if (!alive || current.status !== "manual") return;
    emit({ ready: true, method: "aloud", message: "You practised aloud!" });
  }
  function destroy() {
    if (!alive) return;
    alive = false;
    generation++;
    releaseCapture();
    releaseClip();
  }
  return {
    start,
    stop,
    cancel,
    practiseAloud,
    confirmAloud,
    destroy,
    getState: snapshot,
  };
}

export function mountSpeakingPractice(
  container,
  {
    onReady = () => {},
    onBeforeRecord = () => {},
    onState = () => {},
    filename = "mandarin-practice",
    environment,
  } = {},
) {
  if (!container) throw new Error("A speaking-practice container is required.");
  container.innerHTML = `<section class="speaking-practice" aria-label="Your speaking practice">
    <div class="practice-status"><span class="practice-dot" aria-hidden="true"></span><span data-practice-status role="status" aria-live="polite"></span><time data-practice-time aria-label="Recording duration" aria-live="off">00:00 / 00:15</time></div>
    <div class="practice-actions"><button type="button" class="primary" data-practice-record>Record</button><button type="button" class="primary practice-stop" data-practice-stop hidden>Stop recording</button><button type="button" class="secondary" data-practice-manual>Practise without recording</button><button type="button" class="primary" data-practice-confirm hidden>I’ve said it</button></div>
    <div class="practice-playback" data-practice-playback hidden><audio controls preload="metadata" aria-label="Play your recording"></audio><a class="secondary practice-save" data-practice-save>Save audio</a></div>
    <p class="practice-privacy">Your recording stays in this browser. Save it before leaving.</p>
  </section>`;
  const find = (selector) => container.querySelector(selector),
    root = find(".speaking-practice"),
    status = find("[data-practice-status]"),
    time = find("[data-practice-time]"),
    record = find("[data-practice-record]"),
    stopButton = find("[data-practice-stop]"),
    manual = find("[data-practice-manual]"),
    confirm = find("[data-practice-confirm]"),
    playback = find("[data-practice-playback]"),
    audio = find("audio"),
    save = find("[data-practice-save]");
  let alive = true,
    lastReady = false,
    lastMethod = null,
    lastStatus = null,
    lastURL = null;
  const silencePlayback = () => {
    audio.pause();
  };
  function render(state) {
    if (!alive) return;
    root.dataset.state = state.status;
    // Keep the live region quiet while only the elapsed timer changes.
    if (status.textContent !== state.message)
      status.textContent = state.message;
    time.textContent = `00:${String(Math.floor(state.seconds)).padStart(2, "0")} / 00:15`;
    const busy = ["requesting", "recording", "stopping"].includes(state.status);
    record.hidden = state.status === "recording" || state.status === "stopping";
    record.disabled = busy;
    record.textContent =
      state.status === "requesting"
        ? "Waiting for microphone…"
        : state.status === "ready"
          ? "Record again"
          : state.status === "manual"
            ? "Record instead"
            : state.status === "error"
              ? "Try recording again"
              : "Record";
    stopButton.hidden = !["recording", "stopping"].includes(state.status);
    stopButton.disabled = state.status !== "recording";
    manual.hidden = state.status === "manual";
    manual.disabled = false;
    confirm.hidden = state.status !== "manual";
    confirm.disabled = state.ready;
    playback.hidden = !state.url;
    if (state.url !== lastURL) {
      silencePlayback();
      if (state.url) {
        audio.src = state.url;
        save.href = state.url;
        const safeName =
          String(filename)
            .replace(/[^a-zA-Z0-9_-]/g, "-")
            .slice(0, 60) || "mandarin-practice";
        save.download = `${safeName}.${recordingExtension(state.mimeType)}`;
      } else {
        audio.removeAttribute("src");
        audio.load();
        save.removeAttribute("href");
      }
      lastURL = state.url;
    }
    if (state.status !== lastStatus) {
      lastStatus = state.status;
      onState(state.status);
    }
    if (state.ready !== lastReady || state.method !== lastMethod) {
      lastReady = state.ready;
      lastMethod = state.method;
      onReady(state.ready, { method: state.method });
    }
  }
  const controller = createPracticeRecorder({
    environment,
    onChange: render,
    onBeforeRecord: () => {
      silencePlayback();
      onBeforeRecord();
    },
  });
  record.onclick = () => controller.start();
  stopButton.onclick = () => controller.stop();
  manual.onclick = () => {
    silencePlayback();
    controller.practiseAloud();
  };
  confirm.onclick = () => controller.confirmAloud();
  audio.onplay = () => {
    onBeforeRecord();
    onState("playing");
  };
  audio.onpause = audio.onended = () => {
    if (alive) onState(controller.getState().status);
  };
  const document = container.ownerDocument;
  const view = document.defaultView;
  const onVisibility = () => {
    if (document.hidden) {
      silencePlayback();
      controller.cancel();
    }
  };
  const onPageHide = () => {
    silencePlayback();
    controller.cancel();
  };
  document.addEventListener("visibilitychange", onVisibility);
  view?.addEventListener("pagehide", onPageHide);
  render(controller.getState());
  return {
    cancel: () => {
      silencePlayback();
      controller.cancel();
    },
    getState: controller.getState,
    destroy() {
      if (!alive) return;
      alive = false;
      audio.onplay = audio.onpause = audio.onended = null;
      silencePlayback();
      audio.removeAttribute("src");
      audio.load();
      controller.destroy();
      document.removeEventListener("visibilitychange", onVisibility);
      view?.removeEventListener("pagehide", onPageHide);
      onState("idle");
      container.replaceChildren();
    },
  };
}
