// Audio processing
export const DEFAULT_GAIN = 2.0;
export const MAX_GAIN = 5.0;
export const HIGH_SAMPLE_RATE = 48000;
export const STANDARD_SAMPLE_RATE = 44100;
export const AUDIO_CHANNELS = 2;

// Compressor node settings
export const COMPRESSOR = {
  threshold: -24,
  knee: 30,
  ratio: 12,
  attack: 0.003,
  release: 0.25
} as const;

// Bitrates (bps)
export const AUDIO_BITRATE = 128_000;
export const VIDEO_BITRATE = 2_500_000;
export const COMBINED_BITRATE = 2_800_000;

// Timings (ms)
export const DATA_TIMESLICE_MS = 100;
export const HEARTBEAT_INTERVAL_MS = 2000;
export const HEARTBEAT_STALL_MS = 1000;
export const RECORDER_STOP_TIMEOUT_MS = 3000;
export const ERROR_RECOVERY_DELAY_MS = 500;
export const TRACK_INIT_DELAY_MS = 100;
export const STREAM_INIT_TIMEOUT_MS = 10_000;

// Audio graph
export const GAIN_RAMP_DURATION = 0.05;
export const NOISE_FILTER_FREQUENCY = 8000;
