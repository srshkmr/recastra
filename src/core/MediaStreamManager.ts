/**
 * MediaStreamManager - Handles media stream initialization and device enumeration
 */

import {
  stopMediaStreamTracks,
  removeAudioTracks,
  addTracksToStream,
  createAudioConstraints
} from '../utils/media';
import { executeWithTimeout, safeExecuteAsync } from '../utils/error';

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
    return safeExecuteAsync(async () => {
      // Prepare constraints based on audioOnly setting
      const preparedConstraints = this.prepareConstraints(constraints);

      // Request the media stream with a timeout to prevent hanging
      this.stream = await executeWithTimeout(
        () => navigator.mediaDevices.getUserMedia(preparedConstraints),
        10000,
        'Media access timeout - user may not have granted permissions'
      );

      // Log success with track information for debugging
      console.warn(
        `Stream initialized with ${this.stream.getAudioTracks().length} audio tracks and ${this.stream.getVideoTracks().length} video tracks`
      );

      return this.stream;
    }, 'Error accessing media devices');
  }

  /**
   * Prepares constraints based on audioOnly setting
   * @param constraints - Original constraints
   * @returns Prepared constraints
   */
  private prepareConstraints(constraints: MediaStreamConstraints): MediaStreamConstraints {
    // If audioOnly is true, ensure video is disabled and audio is optimized
    if (this.audioOnly) {
      return {
        audio: createAudioConstraints(constraints.audio, true), // Use high quality audio
        video: false
      };
    }

    // For video recordings with boolean audio, ensure audio constraints are properly set
    if (constraints.audio === true) {
      return {
        ...constraints,
        audio: createAudioConstraints(true, false) // Use standard quality audio
      };
    }

    // If custom audio constraints are provided, ensure essential properties are set
    if (constraints.audio && typeof constraints.audio !== 'boolean') {
      return {
        ...constraints,
        audio: createAudioConstraints(constraints.audio, false) // Use standard quality audio with custom constraints
      };
    }

    // Return original constraints if no audio or if already properly configured
    return constraints;
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
    return safeExecuteAsync(async () => {
      // If we want to maintain the video stream when changing audio inputs
      if (maintainVideo && this.stream && constraints.audio && !this.audioOnly) {
        // Get current video tracks
        const videoTracks = this.stream.getVideoTracks();

        if (videoTracks.length > 0) {
          // Remove all existing audio tracks from the stream
          removeAudioTracks(this.stream);

          // Get new audio stream with explicit audio constraints
          const audioConstraints = {
            audio: createAudioConstraints(constraints.audio, false),
            video: false
          };

          let audioStream = await navigator.mediaDevices.getUserMedia(audioConstraints);

          // Add new audio tracks to existing stream
          addTracksToStream(audioStream, this.stream, 'audio');

          // Small delay to ensure audio tracks are properly initialized
          await new Promise<void>(resolve => setTimeout(resolve, 100));
        } else {
          // If no video tracks, get a completely new stream
          if (this.stream) {
            stopMediaStreamTracks(this.stream);
          }
          this.stream = await this.initStream(constraints);
        }
      } else {
        // Stop all tracks in the current stream
        if (this.stream) {
          stopMediaStreamTracks(this.stream);
        }

        // Get new stream with updated constraints
        this.stream = await this.initStream(constraints);
      }

      return this.stream;
    }, 'Error updating stream');
  }

  /**
   * Gets available audio input devices
   * @returns Promise resolving to an array of audio input devices
   */
  public async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    return safeExecuteAsync(async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    }, 'Error getting audio devices');
  }

  /**
   * Gets available video input devices
   * @returns Promise resolving to an array of video input devices
   */
  public async getVideoDevices(): Promise<MediaDeviceInfo[]> {
    return safeExecuteAsync(async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    }, 'Error getting video devices');
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
      stopMediaStreamTracks(this.stream);
      this.stream = null;
    }
  }
}
