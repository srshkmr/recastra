/**
 * Recastra - A lightweight TypeScript plugin for recording audio and video using WebRTC
 */

import { MediaStreamManager, MediaStreamManagerOptions } from './core/MediaStreamManager';
import { AudioProcessor, AudioProcessorOptions } from './core/AudioProcessor';
import { RecordingManager, RecordingManagerOptions } from './core/RecordingManager';
import { FileManager, FileManagerOptions } from './core/FileManager';

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

/**
 * Main Recastra class for handling WebRTC recording
 */
export class Recastra {
  private streamManager: MediaStreamManager;
  private audioProcessor: AudioProcessor;
  private recordingManager: RecordingManager;
  private fileManager: FileManager;
  private audioOnly: boolean = false;

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
    try {
      // Initialize the stream
      let stream = await this.streamManager.initStream(constraints);

      // Process the audio stream to boost volume if there are audio tracks and gain > 1.0
      if (stream.getAudioTracks().length > 0) {
        stream = this.audioProcessor.processAudioStream(stream);
      }
    } catch (error) {
      console.error('Error initializing Recastra:', error);
      throw new Error(
        `Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
      // Store the current state
      const wasRecording = this.recordingManager.getState() === 'recording';
      const wasPaused = this.recordingManager.getState() === 'paused';

      // Stop recording if active
      if (wasRecording || wasPaused) {
        await this.stop();
      }

      // Reprocess the stream with the new gain
      this.audioProcessor.processAudioStream(stream);

      // Update the stream in the stream manager
      await this.streamManager.updateStream({
        audio: true,
        video: !this.audioOnly
      });

      // Restart recording if it was active
      if (wasRecording) {
        this.start();
      } else if (wasPaused) {
        this.start();
        this.pause();
      }
    }
  }

  /**
   * Starts recording with optimized settings for continuous audio capture
   */
  public start(): void {
    const stream = this.streamManager.getStream();
    if (!stream) {
      throw new Error('Stream not initialized. Call init() first.');
    }

    this.recordingManager.start(stream);
  }

  /**
   * Stops recording and returns the recorded blob
   * @returns Promise resolving to the recorded Blob
   */
  public stop(): Promise<Blob> {
    return this.recordingManager.stop();
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
    const wasRecording = this.recordingManager.getState() === 'recording';
    const wasPaused = this.recordingManager.getState() === 'paused';

    // Store current recording data if recording
    if (wasRecording || wasPaused) {
      await this.stop();
    }

    try {
      // Update the stream
      let stream = await this.streamManager.updateStream(constraints, maintainVideo);

      // Process the audio stream if needed
      if (stream.getAudioTracks().length > 0) {
        stream = this.audioProcessor.processAudioStream(stream);
      }

      // Restart recording if it was recording before
      if (wasRecording) {
        this.start();
      } else if (wasPaused) {
        this.start();
        this.pause();
      }
    } catch (error) {
      console.error('Error updating stream:', error);
      throw new Error('Failed to update stream');
    }
  }

  /**
   * Returns the current active MediaStream
   */
  public getStream(): MediaStream {
    const stream = this.streamManager.getStream();
    if (!stream) {
      throw new Error('Stream not initialized. Call init() first.');
    }
    return stream;
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
   * Downloads the recording using a generated blob URL
   * @param fileName - Optional file name (defaults to 'recording.[ext]')
   */
  public save(fileName?: string): void {
    const blob = this.recordingManager.getRecordingBlob();
    if (!blob) {
      throw new Error('No recording available. Record something first.');
    }

    this.fileManager.save(
      blob,
      this.recordingManager.getState() === 'inactive'
        ? 'video/webm'
        : this.recordingManager['mimeType'],
      fileName
    );
  }

  /**
   * Saves the recording as audio only, extracting audio from video if necessary
   * Always saves in WAV format for maximum compatibility
   * @param fileName - Optional file name (defaults to 'recording-audio.wav')
   */
  public saveAsAudio(fileName?: string): void {
    const blob = this.recordingManager.getRecordingBlob();
    if (!blob) {
      throw new Error('No recording available. Record something first.');
    }

    this.fileManager.saveAsAudio(blob, fileName);
  }

  /**
   * Uploads the recording to a server via HTTP POST
   * @param url - Server URL to upload to
   * @param formFieldName - Form field name (defaults to "file")
   * @returns Promise resolving to the server Response
   */
  public async upload(url: string, formFieldName: string = 'file'): Promise<Response> {
    const blob = this.recordingManager.getRecordingBlob();
    if (!blob) {
      throw new Error('No recording available. Record something first.');
    }

    return this.fileManager.upload(blob, url, formFieldName);
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
  public dispose(): void {
    this.streamManager.dispose();
    this.audioProcessor.dispose();
    this.recordingManager.dispose();
  }
}
