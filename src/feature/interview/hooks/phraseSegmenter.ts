/**
 * Splits continuous microphone input into phrases at natural pauses, so each
 * phrase can be captioned (Whisper) while the patient is still talking.
 *
 * Pure state machine fed with RMS levels — no media APIs — so it is testable.
 * The voice threshold adapts to the room: it sits a margin above a slowly
 * tracked noise floor, never below `minThreshold`.
 */

export interface PhraseSegmenterConfig {
  /** Minimum RMS that counts as voice (0–1) on a normal microphone. */
  minThreshold: number;
  /**
   * Lowest that minimum can go for a quiet microphone (some phones deliver much
   * lower levels): the minimum follows the loudest recent sound, never above
   * `minThreshold` nor below this.
   */
  quietMinThreshold: number;
  /** The minimum is this share of the loudest recent sound. */
  peakFraction: number;
  /** How much of the loudest-sound memory is kept after one second (0–1). */
  peakDecayPerSecond: number;
  /** Voice must be this many times louder than the noise floor. */
  floorMultiplier: number;
  /** Pause after speech that ends a phrase. */
  pauseMs: number;
  /** Longest phrase before it is cut anyway (keeps captions flowing). */
  maxSegmentMs: number;
  /** Voiced time needed before a segment is worth transcribing. */
  minVoicedMs: number;
  /** How long "voice active" stays on after the last voiced frame. */
  hangoverMs: number;
}

export const DEFAULT_SEGMENTER_CONFIG: PhraseSegmenterConfig = {
  minThreshold: 0.012,
  quietMinThreshold: 0.004,
  peakFraction: 0.3,
  peakDecayPerSecond: 0.95,
  floorMultiplier: 2.5,
  pauseMs: 700,
  maxSegmentMs: 12000,
  minVoicedMs: 200,
  hangoverMs: 300,
};

/** "send" = transcribe the segment; "discard" = it held no speech. */
export type SegmentCut = "none" | "send" | "discard";

export interface SegmenterStep {
  voiceActive: boolean;
  cut: SegmentCut;
  /** The level that counted as voice for this frame. */
  threshold: number;
}

export function createPhraseSegmenter(config: PhraseSegmenterConfig = DEFAULT_SEGMENTER_CONFIG) {
  let noiseFloor = 0;
  // Starts as if the microphone were normal, so nothing changes until it proves quiet.
  let loudestRecent = config.minThreshold / config.peakFraction;
  let segmentStart: number | null = null;
  let lastFeed: number | null = null;
  let voicedMs = 0;
  let lastVoiceAt: number | null = null;

  const resetSegment = (now: number) => {
    segmentStart = now;
    voicedMs = 0;
  };

  return {
    feed(rms: number, now: number): SegmenterStep {
      if (segmentStart === null) resetSegment(now);
      const dt = lastFeed === null ? 0 : Math.max(0, now - lastFeed);
      lastFeed = now;

      loudestRecent = Math.max(rms, loudestRecent * config.peakDecayPerSecond ** (dt / 1000));
      const minimum = Math.min(config.minThreshold, Math.max(config.quietMinThreshold, loudestRecent * config.peakFraction));
      const threshold = Math.max(minimum, noiseFloor * config.floorMultiplier);
      if (rms >= threshold) {
        voicedMs += dt;
        lastVoiceAt = now;
      } else {
        // Track the room's background level only from non-voice frames.
        noiseFloor = noiseFloor * 0.95 + rms * 0.05;
      }

      const voiceActive = lastVoiceAt !== null && now - lastVoiceAt < config.hangoverMs;
      const hasSpeech = voicedMs >= config.minVoicedMs;
      let cut: SegmentCut = "none";

      if (hasSpeech && lastVoiceAt !== null && now - lastVoiceAt >= config.pauseMs) {
        cut = "send";
      } else if (now - (segmentStart as number) >= config.maxSegmentMs) {
        cut = hasSpeech ? "send" : "discard";
      }

      if (cut !== "none") resetSegment(now);
      return { voiceActive, cut, threshold };
    },
    /** Start a fresh segment (e.g. after the AI finished speaking). */
    reset(now: number) {
      resetSegment(now);
      lastVoiceAt = null;
    },
    get lastVoiceAt() {
      return lastVoiceAt;
    },
  };
}
