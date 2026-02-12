/**
 * AudioProcessor - Handles audio processing and gain control
 */

import { createOptimizedAudioContext, createProcessedAudioStream } from '../utils/audio';
import { DEFAULT_GAIN, MAX_GAIN } from '../constants';
import { ERR_GAIN_POSITIVE } from '../errors';

export interface AudioProcessorOptions {
  audioGain?: number;
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audioGain: number;

  constructor(options?: AudioProcessorOptions) {
    this.audioGain = options?.audioGain ?? DEFAULT_GAIN;
  }

  /** Sets the audio gain level (1.0 = normal, higher = louder) */
  public setAudioGain(gain: number): void {
    if (!Number.isFinite(gain) || gain <= 0) {
      throw new Error(ERR_GAIN_POSITIVE);
    }
    if (gain > MAX_GAIN) {
      console.warn(`Gain ${gain} exceeds recommended max of ${MAX_GAIN}, distortion may occur`);
    }

    this.audioGain = gain;

    if (this.gainNode) {
      this.gainNode.gain.value = gain;
      console.info(`Updated audio gain to: ${gain}`);
    }
  }

  /** Process the audio stream — applies gain, filtering and compression */
  public processAudioStream(stream: MediaStream): MediaStream {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = createOptimizedAudioContext();
      } else if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(err => {
          console.warn('Failed to resume AudioContext:', err);
        });
      }

      const processedStream = createProcessedAudioStream(stream, this.audioContext, this.audioGain);

      console.info(
        `Processed audio stream with gain: ${this.audioGain}, sample rate: ${this.audioContext.sampleRate}Hz`
      );

      return processedStream;
    } catch (error) {
      console.error('Error processing audio stream:', error);
      return stream;
    }
  }

  /** Release AudioContext and associated resources */
  public async dispose(): Promise<void> {
    if (!this.audioContext) {
      return;
    }

    try {
      if (this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }
    } catch (error) {
      console.warn('Error closing AudioContext:', error);
    } finally {
      this.audioContext = null;
      this.gainNode = null;
    }
  }
}
