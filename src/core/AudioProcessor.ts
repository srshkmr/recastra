/**
 * AudioProcessor - Handles audio processing and gain control
 */

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
      // Reuse existing audio context if possible to prevent interruptions
      if (!this.audioContext || this.audioContext.state === 'closed') {
        // Create a new AudioContext with optimal settings for audio processing
        this.audioContext = new AudioContext({
          latencyHint: 'interactive', // Optimize for lower latency
          sampleRate: 48000 // Use high sample rate for better quality
        });
      } else if (this.audioContext.state === 'suspended') {
        // Resume the audio context if it was suspended
        this.audioContext.resume().catch(err => {
          console.warn('Failed to resume AudioContext:', err);
        });
      }

      // Create a GainNode for volume control with smoothing
      this.gainNode = this.audioContext.createGain();

      // Set the gain value with a slight ramp to prevent clicks/pops
      const currentTime = this.audioContext.currentTime;
      this.gainNode.gain.setValueAtTime(0, currentTime);
      this.gainNode.gain.linearRampToValueAtTime(this.audioGain, currentTime + 0.05);

      // Create a MediaStreamAudioSourceNode from the input stream
      const sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Create a BiquadFilterNode for noise reduction
      const filterNode = this.audioContext.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.value = 8000; // Reduce high-frequency noise

      // Create a compressor to even out volume levels and prevent clipping
      const compressorNode = this.audioContext.createDynamicsCompressor();
      compressorNode.threshold.value = -24;
      compressorNode.knee.value = 30;
      compressorNode.ratio.value = 12;
      compressorNode.attack.value = 0.003;
      compressorNode.release.value = 0.25;

      // Create a MediaStreamDestinationNode to output the processed audio
      const destinationNode = this.audioContext.createMediaStreamDestination();

      // Connect the nodes: source -> filter -> compressor -> gain -> destination
      sourceNode.connect(filterNode);
      filterNode.connect(compressorNode);
      compressorNode.connect(this.gainNode);
      this.gainNode.connect(destinationNode);

      // Get the video tracks from the original stream
      const videoTracks = stream.getVideoTracks();

      // Create a new MediaStream with the processed audio track
      const processedStream = new MediaStream();

      // Add the processed audio track to the new stream with constraints to ensure stability
      destinationNode.stream.getAudioTracks().forEach(track => {
        // Set track constraints for stability
        if (track.applyConstraints) {
          track
            .applyConstraints({
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: false // We're handling gain manually
            })
            .catch(err => {
              console.warn('Failed to apply audio track constraints:', err);
            });
        }
        processedStream.addTrack(track);
      });

      // Add the original video tracks to the new stream (if any)
      videoTracks.forEach(track => {
        processedStream.addTrack(track);
      });

      console.warn(
        `Processed audio stream with gain: ${this.audioGain}, sample rate: ${this.audioContext.sampleRate}Hz`
      );
      return processedStream;
    } catch (error) {
      console.error('Error processing audio stream:', error);

      // Attempt recovery by closing and nullifying the audio context
      try {
        if (this.audioContext) {
          this.audioContext.close().catch(() => {});
          this.audioContext = null;
        }
        this.gainNode = null;
      } catch (cleanupError) {
        console.warn('Error during audio context cleanup:', cleanupError);
      }

      // If processing fails, return the original stream
      return stream;
    }
  }

  /**
   * Disposes of the AudioProcessor and releases resources
   */
  public dispose(): void {
    // Clean up audio processing resources
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.gainNode = null;
  }
}
