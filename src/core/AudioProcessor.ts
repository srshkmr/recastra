/**
 * AudioProcessor - Handles audio processing and gain control
 */

import { createOptimizedAudioContext, createProcessedAudioStream } from '../utils/audio';

/**
 * Interface for AudioProcessor options
 */
export interface AudioProcessorOptions {
  /**
   * Audio gain level (1.0 is normal, higher values boost volume)
   * Values between 1.0 and 3.0 are recommended
   */
  audioGain?: number;
}

/**
 * AudioProcessor class for handling audio processing and gain control
 */
export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audioGain: number = 2.0; // Default gain level for boosting audio volume

  /**
   * Creates a new AudioProcessor instance
   * @param options - Configuration options
   */
  constructor(options?: AudioProcessorOptions) {
    if (options?.audioGain !== undefined) {
      // Set custom gain level if provided
      this.audioGain = options.audioGain;
    }
  }

  /**
   * Sets the audio gain level for volume boosting
   * @param gain - Gain level (1.0 is normal, higher values boost volume)
   */
  public setAudioGain(gain: number): void {
    if (gain <= 0) {
      throw new Error('Gain must be greater than 0');
    }

    this.audioGain = gain;

    // If we have an active gain node, update its value immediately
    if (this.gainNode) {
      this.gainNode.gain.value = gain;
      console.warn(`Updated audio gain to: ${gain}`);
    }
  }

  /**
   * Processes the audio stream to boost volume using a GainNode
   * @param stream - The original MediaStream
   * @returns A new MediaStream with boosted audio
   */
  public processAudioStream(stream: MediaStream): MediaStream {
    try {
      // Process synchronously to maintain return type compatibility
      // Reuse existing audio context if possible to prevent interruptions
      if (!this.audioContext || this.audioContext.state === 'closed') {
        // Create a new AudioContext with optimal settings for audio processing
        this.audioContext = createOptimizedAudioContext();
      } else if (this.audioContext.state === 'suspended') {
        // Resume the audio context if it was suspended
        this.audioContext.resume().catch(err => {
          console.warn('Failed to resume AudioContext:', err);
        });
      }

      // Create a processed audio stream with gain, filtering, and compression
      const processedStream = createProcessedAudioStream(stream, this.audioContext, this.audioGain);

      // Store the gain node reference for later updates
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.audioGain;

      console.warn(
        `Processed audio stream with gain: ${this.audioGain}, sample rate: ${this.audioContext.sampleRate}Hz`
      );

      return processedStream;
    } catch (error) {
      console.error('Error processing audio stream:', error);
      return stream; // Return original stream as fallback if processing fails
    }
  }

  /**
   * Disposes of the AudioProcessor and releases resources
   */
  public dispose(): void {
    // Clean up audio processing resources
    if (this.audioContext) {
      try {
        // Check if close method exists and is a function
        if (this.audioContext.close && typeof this.audioContext.close === 'function') {
          // Use a void IIFE to handle the async operation without changing the return type
          void this.audioContext.close().catch(() => {
            console.warn('Error closing AudioContext');
          });
        }
      } catch (error) {
        console.warn('Error disposing AudioProcessor:', error);
      } finally {
        this.audioContext = null;
        this.gainNode = null;
      }
    }
  }
}
