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
   * @returns The recording blob
   */
  public save(fileName?: string): Blob {
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

    return blob;
  }

  /**
   * Saves the recording as audio only, extracting audio from video if necessary
   * Always saves in WAV format for maximum compatibility
   * @param fileName - Optional file name (defaults to 'recording-audio.wav')
   * @returns The audio blob
   */
  public saveAsAudio(fileName?: string): Blob {
    const blob = this.recordingManager.getRecordingBlob();
    if (!blob) {
      throw new Error('No recording available. Record something first.');
    }

    return this.fileManager.saveAsAudio(blob, fileName);
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
   * Creates a video element to replay the recording
   * @param container - Optional container element to append the video to
   * @param options - Optional video element attributes
   * @returns The created video element
   */
  public replay(
    container?: HTMLElement,
    options?: {
      width?: string | number;
      height?: string | number;
      controls?: boolean;
      autoplay?: boolean;
      muted?: boolean;
      loop?: boolean;
    }
  ): HTMLVideoElement {
    const blob = this.recordingManager.getRecordingBlob();
    if (!blob) {
      throw new Error('No recording available. Record something first.');
    }

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a video element
    const video = document.createElement('video');

    // Set default attributes
    video.src = url;
    video.controls = options?.controls !== undefined ? options.controls : true;
    video.autoplay = options?.autoplay !== undefined ? options.autoplay : false;
    video.muted = options?.muted !== undefined ? options.muted : false;
    video.loop = options?.loop !== undefined ? options.loop : false;

    // Set dimensions if provided
    if (options?.width) {
      video.width = typeof options.width === 'number' ? options.width : parseInt(options.width, 10);
    }
    if (options?.height) {
      video.height =
        typeof options.height === 'number' ? options.height : parseInt(options.height, 10);
    }

    // Add event listener to revoke the URL when the video is no longer needed
    video.addEventListener('loadeddata', () => {
      console.log('Video loaded successfully');
    });

    // Clean up the URL when the video is removed from the DOM
    video.addEventListener('remove', () => {
      URL.revokeObjectURL(url);
    });

    // Append to container if provided
    if (container) {
      container.appendChild(video);
    }

    return video;
  }

  /**
   * Creates an audio element to replay the audio recording
   * @param container - Optional container element to append the audio to
   * @param options - Optional audio element attributes
   * @returns The created audio element
   */
  public replayAudio(
    container?: HTMLElement,
    options?: {
      controls?: boolean;
      autoplay?: boolean;
      loop?: boolean;
    }
  ): HTMLAudioElement {
    const blob = this.recordingManager.getRecordingBlob();
    if (!blob) {
      throw new Error('No recording available. Record something first.');
    }

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create an audio element
    const audio = document.createElement('audio');

    // Set default attributes
    audio.src = url;
    audio.controls = options?.controls !== undefined ? options.controls : true;
    audio.autoplay = options?.autoplay !== undefined ? options.autoplay : false;
    audio.loop = options?.loop !== undefined ? options.loop : false;

    // Add event listener to revoke the URL when the audio is no longer needed
    audio.addEventListener('loadeddata', () => {
      console.log('Audio loaded successfully');
    });

    // Clean up the URL when the audio is removed from the DOM
    audio.addEventListener('remove', () => {
      URL.revokeObjectURL(url);
    });

    // Append to container if provided
    if (container) {
      container.appendChild(audio);
    }

    return audio;
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
