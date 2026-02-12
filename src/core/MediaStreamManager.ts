/**
 * MediaStreamManager - Handles media stream initialization and device enumeration
 */

import {
  stopMediaStreamTracks,
  removeAudioTracks,
  removeVideoTracks,
  addTracksToStream,
  createAudioConstraints
} from '../utils/media';
import { executeWithTimeout, safeExecuteAsync } from '../utils/error';
import { STREAM_INIT_TIMEOUT_MS, TRACK_INIT_DELAY_MS } from '../constants';
import { ERR_MEDIA_TIMEOUT } from '../errors';

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
    this.audioOnly = options?.audioOnly ?? false;
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

      this.stream = await executeWithTimeout(
        () => navigator.mediaDevices.getUserMedia(preparedConstraints),
        STREAM_INIT_TIMEOUT_MS,
        ERR_MEDIA_TIMEOUT
      );

      console.info(
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
      // Full stream replacement
      if (!maintainVideo || !this.stream) {
        if (this.stream) stopMediaStreamTracks(this.stream);
        this.stream = await this.initStream(constraints);
        return this.stream;
      }

      const videoTracks = this.stream.getVideoTracks();

      // Handle audio track updates
      if (constraints.audio && !this.audioOnly) {
        removeAudioTracks(this.stream);
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: createAudioConstraints(constraints.audio, false),
          video: false
        });
        addTracksToStream(audioStream, this.stream, 'audio');
      }

      // Handle video track updates (check if device changed)
      if (constraints.video && !this.audioOnly) {
        const newDeviceId = this.getDeviceId(constraints.video);
        const currentDeviceId = videoTracks[0]?.getSettings()?.deviceId;

        if (!videoTracks.length || (newDeviceId && newDeviceId !== currentDeviceId)) {
          removeVideoTracks(this.stream);
          const videoStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: constraints.video
          });
          addTracksToStream(videoStream, this.stream, 'video');
        }
      }

      await new Promise<void>(resolve => setTimeout(resolve, TRACK_INIT_DELAY_MS));
      return this.stream;
    }, 'Error updating stream');
  }

  /** Extracts deviceId from video constraints */
  private getDeviceId(constraint: boolean | MediaTrackConstraints): string | undefined {
    if (typeof constraint !== 'object') return undefined;

    const { deviceId } = constraint;
    if (!deviceId) return undefined;
    if (typeof deviceId === 'string') return deviceId;
    if (Array.isArray(deviceId)) return deviceId[0];

    return deviceId.exact
      ? typeof deviceId.exact === 'string'
        ? deviceId.exact
        : deviceId.exact[0]
      : deviceId.ideal
        ? typeof deviceId.ideal === 'string'
          ? deviceId.ideal
          : deviceId.ideal[0]
        : undefined;
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
