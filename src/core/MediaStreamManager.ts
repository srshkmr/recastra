/**
 * MediaStreamManager - Handles media stream initialization and device enumeration
 */

/**
 * Interface for MediaStreamManager options
 */
export interface MediaStreamManagerOptions {
  /**
   * Whether to record audio only
   */
  audioOnly?: boolean;
}

/**
 * MediaStreamManager class for handling media stream initialization and device enumeration
 */
export class MediaStreamManager {
  private stream: MediaStream | null = null;
  private audioOnly: boolean = false;

  /**
   * Creates a new MediaStreamManager instance
   * @param options - Configuration options
   */
  constructor(options?: MediaStreamManagerOptions) {
    if (options?.audioOnly) {
      this.audioOnly = options.audioOnly;
    }
  }

  /**
   * Initializes the media stream with custom or default constraints
   * @param constraints - MediaStreamConstraints for audio/video
   * @returns Promise resolving to the initialized MediaStream
   */
  public async initStream(
    constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: true
    }
  ): Promise<MediaStream> {
    try {
      // If audioOnly is true, ensure video is disabled and audio is optimized
      if (this.audioOnly) {
        // For audio-only recordings, use higher quality audio settings
        const audioConstraints =
          typeof constraints.audio === 'boolean'
            ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                // Higher sample rate and bit depth for better audio quality
                sampleRate: 48000,
                channelCount: 2
              }
            : {
                ...constraints.audio,
                // Ensure these are set even if custom constraints are provided
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                // Higher sample rate and bit depth if not explicitly set
                sampleRate: (constraints.audio as MediaTrackConstraints).sampleRate || 48000,
                channelCount: (constraints.audio as MediaTrackConstraints).channelCount || 2
              };

        constraints = { audio: audioConstraints, video: false };
      }
      // For video recordings, ensure audio constraints are properly set
      else if (constraints.audio === true) {
        constraints = {
          ...constraints,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            // Standard audio quality for video recordings
            sampleRate: 44100,
            channelCount: 2
          }
        };
      }
      // If custom audio constraints are provided, ensure essential properties are set
      else if (constraints.audio && typeof constraints.audio !== 'boolean') {
        const audioConstraints = constraints.audio;
        constraints = {
          ...constraints,
          audio: {
            ...audioConstraints,
            // Ensure these are set even if not provided in custom constraints
            echoCancellation: audioConstraints.echoCancellation ?? true,
            noiseSuppression: audioConstraints.noiseSuppression ?? true,
            autoGainControl: audioConstraints.autoGainControl ?? true
          }
        };
      }

      // Request the media stream with a timeout to prevent hanging
      const streamPromise = navigator.mediaDevices.getUserMedia(constraints);

      // Set a timeout to prevent hanging if permissions are not granted
      const timeoutPromise = new Promise<MediaStream>((_, reject) => {
        setTimeout(
          () => reject(new Error('Media access timeout - user may not have granted permissions')),
          10000
        );
      });

      // Use Promise.race to either get the stream or timeout
      this.stream = await Promise.race([streamPromise, timeoutPromise]);

      // Log success with track information for debugging
      console.warn(
        `Stream initialized with ${this.stream.getAudioTracks().length} audio tracks and ${this.stream.getVideoTracks().length} video tracks`
      );

      return this.stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error(
        `Failed to initialize media stream: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Updates the stream with new constraints
   * @param constraints - New MediaStreamConstraints
   * @param maintainVideo - Whether to maintain the video stream when changing audio inputs
   * @returns Promise resolving to the updated MediaStream
   */
  public async updateStream(
    constraints: MediaStreamConstraints,
    maintainVideo: boolean = true
  ): Promise<MediaStream> {
    try {
      // If we want to maintain the video stream when changing audio inputs
      if (maintainVideo && this.stream && constraints.audio && !this.audioOnly) {
        // Get current video tracks
        const videoTracks = this.stream.getVideoTracks();

        if (videoTracks.length > 0) {
          // Remove all existing audio tracks from the stream
          this.stream.getAudioTracks().forEach((track: MediaStreamTrack): void => {
            this.stream?.removeTrack(track);
            track.stop();
          });

          // Get new audio stream with explicit audio constraints
          const audioConstraints = {
            audio:
              typeof constraints.audio === 'boolean'
                ? {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                  }
                : constraints.audio,
            video: false
          };

          let audioStream = await navigator.mediaDevices.getUserMedia(audioConstraints);

          // Add new audio tracks to existing stream
          audioStream.getAudioTracks().forEach((track: MediaStreamTrack): void => {
            this.stream?.addTrack(track);
          });

          // Small delay to ensure audio tracks are properly initialized
          await new Promise<void>((resolve: (value: void | PromiseLike<void>) => void) => {
            setTimeout((): void => resolve(), 100);
          });
        } else {
          // If no video tracks, get a completely new stream
          if (this.stream) {
            this.stream.getTracks().forEach((track: MediaStreamTrack): void => track.stop());
          }
          this.stream = await this.initStream(constraints);
        }
      } else {
        // Stop all tracks in the current stream
        if (this.stream) {
          this.stream.getTracks().forEach((track: MediaStreamTrack): void => track.stop());
        }

        // Get new stream with updated constraints
        this.stream = await this.initStream(constraints);
      }

      return this.stream;
    } catch (error) {
      console.error('Error updating stream:', error);
      throw new Error('Failed to update stream');
    }
  }

  /**
   * Gets available audio input devices
   * @returns Promise resolving to an array of audio input devices
   */
  public async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Error getting audio devices:', error);
      throw new Error('Failed to get audio devices');
    }
  }

  /**
   * Gets available video input devices
   * @returns Promise resolving to an array of video input devices
   */
  public async getVideoDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error getting video devices:', error);
      throw new Error('Failed to get video devices');
    }
  }

  /**
   * Returns the current active MediaStream
   * @returns The current MediaStream or null if not initialized
   */
  public getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Disposes of the MediaStreamManager and stops all tracks
   */
  public dispose(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track: MediaStreamTrack): void => track.stop());
      this.stream = null;
    }
  }
}
