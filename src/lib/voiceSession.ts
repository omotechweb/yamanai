// Sesli sohbet dongusu: dinle -> yaziya cevir -> yanit al -> cumle cumle seslendir -> tekrar dinle.
// Tarayicinin kendi ses tanimasi Electron'da calismadigi icin ses sunucuya gonderilir.

export type VoiceState = 'starting' | 'listening' | 'hearing' | 'transcribing' | 'thinking' | 'speaking';
export type VoiceError = 'mic_denied' | 'no_mic' | 'login' | 'limit' | 'network' | 'speech' | 'idle';
export type TurnResult = 'ok' | 'stopped' | 'daily_limit' | 'failed';

// Bir kez kullaniciya tiklatip acilan ses ogesi: iOS Safari sonraki oynatmalara ancak boyle izin verir
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

export function unlockAudio() {
  const audio = new Audio(SILENCE);
  audio.play().catch(() => {});
  return audio;
}

export const voiceSupported = () =>
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

const MIN_SENTENCE_CHARS = 20;
const MAX_CHUNK_CHARS = 400;

/** Akan metinden tamamlanmis cumleleri ayirir; yarim kalan kismi `rest` olarak dondurur. */
export function takeSentences(buffer: string) {
  const sentences: string[] = [];
  let start = 0;
  for (const match of buffer.matchAll(/[.!?…]+["'”’)]*\s+|\n+/g)) {
    const end = match.index + match[0].length;
    if (buffer.slice(start, end).trim().length >= MIN_SENTENCE_CHARS) {
      sentences.push(buffer.slice(start, end).trim());
      start = end;
    }
  }
  let rest = buffer.slice(start);
  // Noktalama gelmeyen cok uzun metin sesi geciktirmesin
  if (rest.length > MAX_CHUNK_CHARS) {
    const cut = Math.max(rest.lastIndexOf(', ', MAX_CHUNK_CHARS), rest.lastIndexOf(' ', MAX_CHUNK_CHARS));
    const at = cut > 0 ? cut + 1 : MAX_CHUNK_CHARS;
    sentences.push(rest.slice(0, at).trim());
    rest = rest.slice(at);
  }
  return { sentences, rest };
}

/** Okununca anlamsiz kacacak markdown isaretlerini ve kodu temizler. */
export function cleanForSpeech(text: string) {
  return text
    .replace(/```[\s\S]*?(```|$)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/^\s*(#+|[-*+>]|\d+\.)\s+/gm, '')
    .replace(/[*_`~#|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const RECORDER_BITRATE = 32_000;
const TICK_MS = 50;
const SPEECH_START_MS = 250;   // bu kadar ses gelmeden konusma baslamis sayilmaz
const SPEECH_END_MS = 1_100;   // konusmadan sonra bu kadar sessizlik sozu bitirir
const MAX_UTTERANCE_MS = 60_000;
const RECORDER_RESET_MS = 15_000; // kimse konusmuyorsa eski kaydi at
const MAX_IDLE_MS = 2 * 60_000;   // mikrofon unutulup acik kalmasin
const MIN_THRESHOLD = 0.012;

interface Options {
  audio: HTMLAudioElement;
  onState: (state: VoiceState) => void;
  onLevel: (level: number) => void;
  /** `fatal` ise oturum kapanmistir. */
  onError: (code: VoiceError, fatal: boolean) => void;
  onTurn: (text: string, onDelta: (delta: string) => void) => Promise<TurnResult>;
  stopTurn: () => void;
}

export class VoiceSession {
  private stopped = false;
  private interrupted = false;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recorder: MediaRecorder | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private requests = new AbortController();
  private endPlayback: (() => void) | null = null;
  private noiseFloor = 0.002;
  private lastSpeechAt = Date.now();

  constructor(private options: Options) {}

  async start() {
    this.options.onState('starting');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      const name = (err as Error)?.name;
      if (!this.stopped) this.options.onError(name === 'NotFoundError' ? 'no_mic' : 'mic_denied', true);
      return;
    }
    if (this.stopped) { this.releaseMic(); return; }

    this.context = new AudioContext();
    await this.context.resume().catch(() => {});
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.context.createMediaStreamSource(this.stream).connect(this.analyser);
    void this.loop();
  }

  /** Yaniti keser ve dinlemeye doner. */
  interrupt() {
    this.interrupted = true;
    this.options.stopTurn();
    this.requests.abort();
    this.requests = new AbortController();
    this.options.audio.pause();
    this.endPlayback?.();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.interrupt();
    if (this.timer) clearInterval(this.timer);
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.releaseMic();
    this.context?.close().catch(() => {});
  }

  private releaseMic() {
    this.stream?.getTracks().forEach(track => track.stop());
  }

  private async loop() {
    while (!this.stopped) {
      const recording = await this.listen();
      if (this.stopped) return;
      if (recording === 'idle') {
        this.options.onError('idle', true);
        return;
      }
      if (!recording) continue;

      this.interrupted = false;
      this.options.onState('transcribing');
      const text = await this.transcribe(recording);
      if (this.stopped) return;
      if (text) await this.runTurn(text);
      this.lastSpeechAt = Date.now();
    }
  }

  private rms() {
    const samples = new Float32Array(this.analyser!.fftSize);
    this.analyser!.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const s of samples) sum += s * s;
    return Math.sqrt(sum / samples.length);
  }

  /** Bir konusma bitene kadar kaydeder. Kimse konusmadiysa null ya da 'idle' dondurur. */
  private listen() {
    return new Promise<Blob | null | 'idle'>(resolve => {
      this.options.onState('listening');
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
        .find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(this.stream!, { mimeType, audioBitsPerSecond: RECORDER_BITRATE });
      this.recorder = recorder;
      const chunks: Blob[] = [];
      const startedAt = Date.now();
      let speechMs = 0;
      let silenceMs = 0;
      let speaking = false;
      let outcome: 'keep' | 'discard' | 'idle' = 'discard';

      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        if (this.timer) clearInterval(this.timer);
        this.options.onLevel(0);
        if (outcome === 'idle') resolve('idle');
        else resolve(outcome === 'keep' ? new Blob(chunks, { type: recorder.mimeType }) : null);
      };
      const finish = (result: typeof outcome) => {
        outcome = result;
        if (this.timer) clearInterval(this.timer);
        if (recorder.state === 'recording') recorder.stop();
      };

      recorder.start(250);
      this.timer = setInterval(() => {
        const level = this.rms();
        const threshold = Math.max(MIN_THRESHOLD, this.noiseFloor * 3);
        const loud = level > threshold;
        this.options.onLevel(Math.min(level / 0.15, 1));

        if (!loud && !speaking) this.noiseFloor = this.noiseFloor * 0.95 + level * 0.05;

        if (loud) {
          speechMs += TICK_MS;
          silenceMs = 0;
          if (!speaking && speechMs >= SPEECH_START_MS) {
            speaking = true;
            this.options.onState('hearing');
          }
        } else if (speaking) {
          silenceMs += TICK_MS;
        } else {
          // Tek bir tiklama gibi kisa sesler konusma sayilmasin
          speechMs = Math.max(0, speechMs - TICK_MS);
        }

        const elapsed = Date.now() - startedAt;
        if (speaking && (silenceMs >= SPEECH_END_MS || elapsed >= MAX_UTTERANCE_MS)) finish('keep');
        else if (!speaking && Date.now() - this.lastSpeechAt >= MAX_IDLE_MS) finish('idle');
        else if (!speaking && elapsed >= RECORDER_RESET_MS) finish('discard');
      }, TICK_MS);
    });
  }

  private async transcribe(recording: Blob) {
    const form = new FormData();
    form.set('audio', recording);
    try {
      const res = await fetch('/api/voice/transcribe', { method: 'POST', body: form, signal: this.requests.signal });
      if (res.status === 401) { this.fatal('login'); return ''; }
      if (res.status === 429) { this.fatal('limit'); return ''; }
      if (!res.ok) throw new Error(String(res.status));
      return String((await res.json()).text ?? '').trim();
    } catch {
      if (!this.interrupted && !this.stopped) this.options.onError('network', false);
      return '';
    }
  }

  private fatal(code: VoiceError) {
    if (this.stopped) return;
    this.options.onError(code, true);
    this.stop();
  }

  private async fetchSpeech(text: string, signal: AbortSignal) {
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal,
      });
      if (res.status === 401) { this.fatal('login'); return null; }
      if (res.status === 429) { this.fatal('limit'); return null; }
      if (!res.ok) throw new Error(String(res.status));
      return await res.blob();
    } catch {
      if (!signal.aborted) this.options.onError('speech', false);
      return null;
    }
  }

  private play(clip: Blob) {
    return new Promise<void>(resolve => {
      const { audio } = this.options;
      const url = URL.createObjectURL(clip);
      const done = () => {
        audio.onended = audio.onerror = null;
        this.endPlayback = null;
        URL.revokeObjectURL(url);
        resolve();
      };
      this.endPlayback = done;
      audio.onended = audio.onerror = done;
      audio.src = url;
      audio.play().catch(done);
    });
  }

  private async runTurn(text: string) {
    const { signal } = this.requests;
    const queue: Promise<Blob | null>[] = [];
    const waiter: { wake?: () => void } = {};
    let finished = false;
    let buffer = '';

    const enqueue = (sentence: string) => {
      const spoken = cleanForSpeech(sentence);
      if (!spoken) return;
      queue.push(this.fetchSpeech(spoken, signal));
      waiter.wake?.();
    };

    const player = (async () => {
      while (!this.interrupted && !this.stopped) {
        const next = queue.shift();
        if (next) {
          const clip = await next;
          if (clip && !this.interrupted && !this.stopped) {
            this.options.onState('speaking');
            await this.play(clip);
          }
        } else if (finished) {
          return;
        } else {
          await new Promise<void>(resolve => { waiter.wake = resolve; });
        }
      }
    })();

    this.options.onState('thinking');
    const result = await this.options.onTurn(text, delta => {
      buffer += delta;
      const { sentences, rest } = takeSentences(buffer);
      buffer = rest;
      sentences.forEach(enqueue);
    });
    if (buffer.trim() && !this.interrupted) enqueue(buffer);
    finished = true;
    waiter.wake?.();
    await player;

    if (result === 'daily_limit') this.fatal('limit');
    else if (result === 'failed' && !this.stopped) this.options.onError('network', false);
  }
}
