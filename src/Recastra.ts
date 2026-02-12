/**
 * Recastra - A lightweight TypeScript plugin for recording audio and video using WebRTC
 */

import { MediaStreamManager, MediaStreamManagerOptions } from './core/MediaStreamManager';
import { AudioProcessor, AudioProcessorOptions } from './core/AudioProcessor';
import { RecordingManager, RecordingManagerOptions } from './core/RecordingManager';
import { FileManager, FileManagerOptions } from './core/FileManager';
import { validateBlob, validateStream } from './utils/validation';
import {
  createVideoElement,
  createAudioElement,
  MediaElementOptions,
  stopMediaStreamTracks,
  removeVideoTracks,
  addTracksToStream
} from './utils/media';
import { safeExecuteAsync } from './utils/error';
import { ERR_STREAM_NOT_INIT, ERR_NO_RECORDING } from './errors';

/**
 * Interface for Recastra options
 */
export interface RecastraOptions {
  /**
   * MIME type for the recording (e.g., 'video/webm', 'audio/webm', 'audio/wav')
   */
  mimeType?: string;

  /**
   * Recording options like bitrate, etc.
   */
  recordingOptions?: MediaRecorderOptions;

  /**
   * Whether to record audio only
   */
  audioOnly?: boolean;

  /**
   * Audio gain level (1.0 is normal, higher values boost volume)
   * Values between 1.0 and 3.0 are recommended
   */
  audioGain?: number;
}

// Re-export for backward compatibility
export type { RecordingState } from './types';

/**
 * Interface for recording blob operations
 */
interface RecordingBlobOperation<T> {
  /**
   * Executes the operation on the recording blob
   * @param blob - The recording blob
   * @returns The result of the operation
   */
  execute(blob: Blob): T;
}

/**
 * Main Recastra class for handling WebRTC recording
 */
export class Recastra {
  private streamManager: MediaStreamManager;
  private audioProcessor: AudioProcessor;
  private recordingManager: RecordingManager;
  private fileManager: FileManager;
  private audioOnly: boolean = false;
  private processedStream: MediaStream | null = null;

  /**
   * Creates a new Recastra instance
   * @param options - Configuration options
   */
  constructor(options?: RecastraOptions) {
    this.audioOnly = options?.audioOnly || false;

    // Initialize the component managers
    const streamManagerOptions: MediaStreamManagerOptions = {
      audioOnly: this.audioOnly
    };
    this.streamManager = new MediaStreamManager(streamManagerOptions);

    const audioProcessorOptions: AudioProcessorOptions = {
      audioGain: options?.audioGain
    };
    this.audioProcessor = new AudioProcessor(audioProcessorOptions);

    const recordingManagerOptions: RecordingManagerOptions = {
      mimeType: options?.mimeType,
      recordingOptions: options?.recordingOptions,
      audioOnly: this.audioOnly
    };
    this.recordingManager = new RecordingManager(recordingManagerOptions);

    const fileManagerOptions: FileManagerOptions = {
      audioOnly: this.audioOnly
    };
    this.fileManager = new FileManager(fileManagerOptions);
  }

  /**
   * Initializes the recorder with custom or default constraints
   * @param constraints - MediaStreamConstraints for audio/video (defaults to {audio: true, video: true})
   */
  public async init(
    constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: true
    }
  ): Promise<void> {
    return safeExecuteAsync(async () => {
      const stream = await this.streamManager.initStream(constraints);
      this.processStreamAudio(stream);
    }, 'Error initializing Recastra');
  }

  /**
   * Sets the MIME type for the recording
   * @param type - MIME type string (e.g., 'video/webm', 'audio/webm')
   */
  public setMimeType(type: string): void {
    this.recordingManager.setMimeType(type);
  }

  /**
   * Sets the audio gain level for volume boosting
   * @param gain - Gain level (1.0 is normal, higher values boost volume)
   * @returns Promise that resolves when the gain is applied
   */
  public async setAudioGain(gain: number): Promise<void> {
    this.audioProcessor.setAudioGain(gain);

    // If we have an active stream with audio tracks, reprocess it with the new gain
    const stream = this.streamManager.getStream();
    if (stream && stream.getAudioTracks().length > 0 && gain > 1.0) {
      await this.handleStreamUpdate(async () => {
        const updatedStream = await this.streamManager.updateStream({
          audio: true,
          video: !this.audioOnly
        });
        return this.processStreamAudio(updatedStream);
      });
    }
  }

  /**
   * Starts recording with optimized settings for continuous audio capture
   */
  public start(): void {
    const stream = this.streamManager.getStream();
    validateStream(stream, ERR_STREAM_NOT_INIT);
    this.recordingManager.start(this.processedStream || (stream as MediaStream));
  }

  /**
   * Stops recording and returns the recorded blob
   * Also stops all media tracks to turn off camera and microphone
   * @returns Promise resolving to the recorded Blob
   */
  public stop(): Promise<Blob> {
    return this.recordingManager.stop().then(blob => {
      // Stop all media tracks to turn off camera and microphone indicators
      const stream = this.streamManager.getStream();
      if (stream) {
        stopMediaStreamTracks(stream);
      }

      // Also stop the processed stream if it exists and is different from the original stream
      if (this.processedStream && this.processedStream !== stream) {
        stopMediaStreamTracks(this.processedStream);
        this.processedStream = null;
      }

      return blob;
    });
  }

  /**
   * Updates the stream with new constraints without stopping recording
   * @param constraints - New MediaStreamConstraints
   * @param maintainVideo - Whether to maintain the video stream when changing audio inputs (default: true)
   */
  public async updateStream(
    constraints: MediaStreamConstraints,
    maintainVideo: boolean = true
  ): Promise<void> {
    try {
      await this.handleStreamUpdate(async () => {
        const stream = await this.streamManager.updateStream(constraints, maintainVideo);
        return this.processStreamAudio(stream);
      });
    } catch (error) {
      console.error('Error updating stream:', error);
      throw new Error('Failed to update stream');
    }
  }

  /**
   * Applies audio processing and keeps the processedStream reference stable
   * so consumers holding it (e.g. via getStream()) see track changes immediately.
   */
  private processStreamAudio(stream: MediaStream): MediaStream {
    if (stream.getAudioTracks().length > 0) {
      const fresh = this.audioProcessor.processAudioStream(stream);

      if (this.processedStream && this.processedStream !== fresh) {
        this.replaceTracksInPlace(fresh);
        return this.processedStream;
      }

      this.processedStream = fresh;
      return this.processedStream;
    }
    this.processedStream = stream;
    return stream;
  }

  /** Swaps all tracks on the existing processedStream with those from the source */
  private replaceTracksInPlace(source: MediaStream): void {
    removeVideoTracks(this.processedStream!);
    addTracksToStream(source, this.processedStream!, 'video');

    this.processedStream!.getAudioTracks().forEach(track => {
      this.processedStream!.removeTrack(track);
      track.stop();
    });
    addTracksToStream(source, this.processedStream!, 'audio');
  }

  /** Handles stream swaps while preserving recording state */
  private async handleStreamUpdate(updateFn: () => Promise<MediaStream>): Promise<void> {
    const currentState = this.recordingManager.getState();

    if (currentState === 'recording' || currentState === 'paused') {
      await this.recordingManager.stop();
    }

    await updateFn();

    if (currentState === 'recording') {
      this.start();
    } else if (currentState === 'paused') {
      this.start();
      this.pause();
    }
  }

  /**
   * Returns the current active MediaStream
   * Returns the processed stream if available, otherwise the original stream
   */
  public getStream(): MediaStream {
    const stream = this.streamManager.getStream();
    validateStream(stream, ERR_STREAM_NOT_INIT);
    return this.processedStream || (stream as MediaStream);
  }

  /**
   * Pauses the recording session
   */
  public pause(): void {
    this.recordingManager.pause();
  }

  /**
   * Resumes a paused recording session
   */
  public resume(): void {
    this.recordingManager.resume();
  }

  /**
   * Gets the recording blob and performs an operation on it
   * @param errorMessage - Error message to display if no recording is available
   * @param operation - Operation to perform on the blob
   * @returns The result of the operation
   */
  private getRecordingBlobAndPerform<T>(
    errorMessage: string,
    operation: RecordingBlobOperation<T>
  ): T {
    const blob = this.recordingManager.getRecordingBlob();
    validateBlob(blob, errorMessage);
    // After validation, we know blob is not null
    return operation.execute(blob as Blob);
  }

  /**
   * Downloads the recording using a generated blob URL or just returns the blob
   * @param fileName - Optional file name (defaults to 'recording.[ext]')
   * @param download - Whether to trigger download (defaults to true)
   * @returns The recording blob
   */
  public save(fileName?: string, download: boolean = true): Blob {
    return this.getRecordingBlobAndPerform(ERR_NO_RECORDING, {
      execute: (blob: Blob) => {
        const mimeType = this.recordingManager.getMimeType();
        this.fileManager.save(blob, mimeType, fileName, download);
        return blob;
      }
    });
  }

  /**
   * Saves the recording as audio only, extracting audio from video if necessary
   * Always saves in WAV format for maximum compatibility
   * @param fileName - Optional file name (defaults to 'recording-audio.wav')
   * @param download - Whether to trigger download (defaults to true)
   * @returns Promise resolving to the audio blob
   */
  public async saveAsAudio(fileName?: string, download: boolean = true): Promise<Blob> {
    return this.getRecordingBlobAndPerform(ERR_NO_RECORDING, {
      execute: (blob: Blob) => this.fileManager.saveAsAudio(blob, fileName, download)
    });
  }

  /**
   * Uploads the recording to a server via HTTP POST
   * @param url - Server URL to upload to
   * @param formFieldName - Form field name (defaults to "file")
   * @returns Promise resolving to the server Response
   */
  public async upload(url: string, formFieldName: string = 'file'): Promise<Response> {
    return this.getRecordingBlobAndPerform(ERR_NO_RECORDING, {
      execute: (blob: Blob) => this.fileManager.upload(blob, url, formFieldName)
    });
  }

  /**
   * Creates a video element to replay the recording
   * @param container - Optional container element to append the video to
   * @param options - Optional video element attributes
   * @returns The created video element
   */
  public replay(container?: HTMLElement, options?: MediaElementOptions): HTMLVideoElement {
    return this.getRecordingBlobAndPerform(ERR_NO_RECORDING, {
      execute: (blob: Blob) => createVideoElement(blob, container, options)
    });
  }

  /**
   * Creates an audio element to replay the audio recording
   * @param container - Optional container element to append the audio to
   * @param options - Optional audio element attributes
   * @returns The created audio element
   */
  public replayAudio(container?: HTMLElement, options?: MediaElementOptions): HTMLAudioElement {
    return this.getRecordingBlobAndPerform(ERR_NO_RECORDING, {
      execute: (blob: Blob) => createAudioElement(blob, container, options)
    });
  }

  /**
   * Gets available audio input devices
   * @returns Promise resolving to an array of audio input devices
   */
  public async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    return this.streamManager.getAudioDevices();
  }

  /**
   * Gets available video input devices
   * @returns Promise resolving to an array of video input devices
   */
  public async getVideoDevices(): Promise<MediaDeviceInfo[]> {
    return this.streamManager.getVideoDevices();
  }

  /**
   * Cleans up resources when the recorder is no longer needed
   */
  public async dispose(): Promise<void> {
    if (this.processedStream) {
      stopMediaStreamTracks(this.processedStream);
      this.processedStream = null;
    }

    this.streamManager.dispose();
    await this.audioProcessor.dispose();
    this.recordingManager.dispose();
  }
}
