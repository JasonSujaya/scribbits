// Tiny procedural battle soundboard. It ships no media, creates audio only in
// the browser, and fails closed when a Reddit WebView keeps audio suspended.

export type BattleSoundCue =
  | 'fight'
  | 'telegraph'
  | 'hit'
  | 'critical'
  | 'shield'
  | 'shrink'
  | 'sudden'
  | 'knockout'
  | 'bell'
  | 'win';

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let sharedAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
    return sharedAudioContext;
  }
  const AudioContextConstructor =
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  try {
    sharedAudioContext = new AudioContextConstructor();
  } catch {
    sharedAudioContext = null;
  }
  return sharedAudioContext;
};

export class BattleSoundboard {
  private enabled = true;
  private readonly lastCueAt = new Map<BattleSoundCue, number>();

  isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) this.unlock();
    return this.enabled;
  }

  unlock(): void {
    if (!this.enabled) return;
    const context = getAudioContext();
    if (context?.state === 'suspended') {
      void context.resume().catch(() => undefined);
    }
  }

  play(cue: BattleSoundCue): void {
    if (!this.enabled) return;
    const context = getAudioContext();
    if (!context) return;

    const playWhenReady = (): void => {
      if (!this.enabled || context.state !== 'running') return;
      const now = context.currentTime;
      const previous = this.lastCueAt.get(cue) ?? -1;
      if (cue === 'hit' && now - previous < 0.045) {
        return;
      }
      this.lastCueAt.set(cue, now);
      this.scheduleCue(context, cue, now);
    };

    if (context.state === 'suspended') {
      void context
        .resume()
        .then(playWhenReady)
        .catch(() => undefined);
      return;
    }
    playWhenReady();
  }

  private tone(
    context: AudioContext,
    startAt: number,
    frequency: number,
    endingFrequency: number,
    duration: number,
    volume: number,
    type: OscillatorType
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), startAt);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endingFrequency),
      startAt + duration
    );
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.01);
  }

  private scheduleCue(
    context: AudioContext,
    cue: BattleSoundCue,
    now: number
  ): void {
    if (cue === 'fight') {
      this.tone(context, now, 130, 210, 0.13, 0.025, 'square');
      this.tone(context, now + 0.08, 210, 330, 0.12, 0.018, 'triangle');
      return;
    }
    if (cue === 'telegraph') {
      this.tone(context, now, 240, 520, 0.16, 0.014, 'sine');
      return;
    }
    if (cue === 'hit') {
      this.tone(context, now, 150, 55, 0.075, 0.022, 'square');
      return;
    }
    if (cue === 'critical') {
      this.tone(context, now, 110, 42, 0.13, 0.035, 'sawtooth');
      this.tone(context, now, 720, 340, 0.1, 0.018, 'triangle');
      return;
    }
    if (cue === 'shield') {
      this.tone(context, now, 520, 180, 0.12, 0.017, 'triangle');
      return;
    }
    if (cue === 'shrink') {
      this.tone(context, now, 210, 95, 0.24, 0.018, 'sawtooth');
      return;
    }
    if (cue === 'sudden') {
      this.tone(context, now, 180, 360, 0.16, 0.02, 'square');
      this.tone(context, now + 0.12, 240, 480, 0.16, 0.02, 'square');
      return;
    }
    if (cue === 'knockout') {
      this.tone(context, now, 170, 45, 0.32, 0.03, 'sawtooth');
      return;
    }
    if (cue === 'bell') {
      // An inharmonic pair gives timeout decisions a small ringside bell
      // without shipping an audio asset or borrowing the knockout sting.
      this.tone(context, now, 920, 860, 0.42, 0.02, 'sine');
      this.tone(context, now, 1_380, 1_240, 0.32, 0.012, 'sine');
      this.tone(context, now + 0.12, 920, 860, 0.38, 0.016, 'sine');
      this.tone(context, now + 0.12, 1_380, 1_240, 0.28, 0.01, 'sine');
      return;
    }
    if (cue === 'win') {
      [330, 440, 660].forEach((frequency, index) => {
        this.tone(
          context,
          now + index * 0.09,
          frequency,
          frequency * 1.04,
          0.16,
          0.018,
          'triangle'
        );
      });
    }
  }
}
