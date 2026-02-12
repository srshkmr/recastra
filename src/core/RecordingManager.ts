/**
 * RecordingManager - Handles recording operations
 */

import { validateStream, validateRecorderState } from '../utils/validation';
import { safeExecuteAsync } from '../utils/error';
import {
  createOptimizedRecorder,
  setupRecordingHeartbeat,
  stopRecorderWithTimeout,
  updateLastDataReceived
} from '../utils/recorder';
import { DATA_TIMESLICE_MS, ERROR_RECOVERY_DELAY_MS } from '../constants';
import { ERR_STREAM_NOT_PROVIDED, ERR_NOT_RECORDING } from '../errors';
import type { RecordingState } from '../types';

/**
 * Interface for RecordingManager options
 */
export interface RecordingManagerOptions {
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
}

/**
 * RecordingManager class for handling recording operations
 */
export class RecordingManager {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mimeType: string = 'video/webm';
  private recordingOptions: MediaRecorderOptions = {};
  private recordingBlob: Blob | null = null;
  private audioOnly: boolean = false;

  /**
   * Creates a new RecordingManager instance
   * @param options - Configuration options
   */
  constructor(options?: RecordingManagerOptions) {
    if (options?.mimeType) {
      this.setMimeType(options.mimeType);
    }

    if (options?.recordingOptions) {
      this.recordingOptions = options.recordingOptions;
    }

    if (options?.audioOnly) {
      this.audioOnly = options.audioOnly;
      // Set appropriate MIME type for audio-only recording
      if (this.audioOnly) {
        this.setMimeType('audio/webm');
      }
    }
  }

  /**
   * Sets the MIME type for the recording
   * @param type - MIME type string (e.g., 'video/webm', 'audio/webm')
   */
  public setMimeType(type: string): void {
    if (MediaRecorder.isTypeSupported(type)) {
      this.mimeType = type;
    } else {
      console.warn(`MIME type ${type} is not supported, using ${this.mimeType} instead`);
    }
  }

  /** Starts recording the given stream with optimized settings */
  public start(stream: MediaStream): void {
    validateStream(stream, ERR_STREAM_NOT_PROVIDED);
    this.chunks = [];

    try {
      this.mediaRecorder = createOptimizedRecorder(
        stream,
        this.mimeType,
        this.recordingOptions,
        this.audioOnly
      );

      const heartbeatInterval = setupRecordingHeartbeat(this.mediaRecorder);

      this.mediaRecorder.ondataavailable = (event: BlobEvent): void => {
        try {
          updateLastDataReceived();

          if (event.data && event.data.size > 0) {
            this.chunks.push(event.data);
          } else if (event.data && event.data.size === 0) {
            console.warn('Received empty data chunk from MediaRecorder');
          }
        } catch (dataError) {
          console.error('Error processing media data:', dataError);

          try {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
              this.mediaRecorder.requestData();
            }
          } catch (recoveryError) {
            console.warn('Failed to request additional data during recovery:', recoveryError);
          }
        }
      };

      this.mediaRecorder.onerror = (event: Event): void => {
        console.error('MediaRecorder error:', event);

        try {
          clearInterval(heartbeatInterval);

          if (this.chunks.length > 0) {
            console.warn('Attempting to recover from MediaRecorder error...');
            const currentStream = this.mediaRecorder?.stream;

            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
              try {
                this.mediaRecorder.stop();
              } catch (stopError) {
                console.warn('Error stopping failed MediaRecorder:', stopError);
              }
            }

            if (currentStream) {
              setTimeout((): void => {
                try {
                  this.start(currentStream);
                  console.info('Successfully recovered from MediaRecorder error');
                } catch (restartError) {
                  console.error('Failed to restart recording after error:', restartError);
                }
              }, ERROR_RECOVERY_DELAY_MS);
            }
          }
        } catch (recoveryError) {
          console.error('Error during MediaRecorder error recovery:', recoveryError);
        }
      };

      this.mediaRecorder.onstop = (): void => {
        clearInterval(heartbeatInterval);
      };

      this.mediaRecorder.start(DATA_TIMESLICE_MS);
      console.info('MediaRecorder started with optimized settings');
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error(
        `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stops recording and returns the recorded blob
   * @returns Promise resolving to the recorded Blob
   */
  public stop(): Promise<Blob> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return Promise.reject(new Error(ERR_NOT_RECORDING));
    }

    return safeExecuteAsync(async () => {
      // Use the utility function to stop the recorder with a timeout
      this.recordingBlob = await stopRecorderWithTimeout(
        this.mediaRecorder!,
        this.chunks,
        this.mimeType
      );

      return this.recordingBlob;
    }, 'Error stopping recording');
  }

  /**
   * Pauses the recording session
   */
  public pause(): void {
    if (this.mediaRecorder) {
      try {
        validateRecorderState(this.mediaRecorder, 'recording', 'Cannot pause: not recording');
        this.mediaRecorder.pause();
      } catch (error) {
        // Silently handle the error - if we're not in recording state, just do nothing
        console.warn('Pause ignored:', error instanceof Error ? error.message : error);
      }
    }
  }

  /**
   * Resumes a paused recording session
   */
  public resume(): void {
    if (this.mediaRecorder) {
      try {
        validateRecorderState(this.mediaRecorder, 'paused', 'Cannot resume: not paused');
        this.mediaRecorder.resume();
      } catch (error) {
        // Silently handle the error - if we're not in paused state, just do nothing
        console.warn('Resume ignored:', error instanceof Error ? error.message : error);
      }
    }
  }

  /** Returns the current recording state */
  public getState(): RecordingState {
    return this.mediaRecorder ? this.mediaRecorder.state : 'inactive';
  }

  /** Returns the MIME type used for recording */
  public getMimeType(): string {
    return this.mimeType;
  }

  /** Returns the recorded blob, or null if nothing has been recorded yet */
  public getRecordingBlob(): Blob | null {
    return this.recordingBlob;
  }

  /** Returns the raw recorded chunks */
  public getChunks(): Blob[] {
    return this.chunks;
  }

  /** Releases resources held by this manager */
  public dispose(): void {
    this.mediaRecorder = null;
    this.chunks = [];
    this.recordingBlob = null;
  }
}
