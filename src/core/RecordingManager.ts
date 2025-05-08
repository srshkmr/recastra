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

  /**
   * Starts recording with optimized settings for continuous audio capture
   * @param stream - The MediaStream to record
   */
  public start(stream: MediaStream): void {
    validateStream(stream, 'Stream not provided. Provide a valid MediaStream.');

    this.chunks = [];

    // Use a void IIFE to handle the operation without changing the return type
    void ((): void => {
      try {
        // Create the MediaRecorder with optimized options
        this.mediaRecorder = createOptimizedRecorder(
          stream,
          this.mimeType,
          this.recordingOptions,
          this.audioOnly
        );

        // Set up a heartbeat to monitor recording health
        const heartbeatInterval = setupRecordingHeartbeat(this.mediaRecorder);

        // Handle data availability with improved error handling
        this.mediaRecorder.ondataavailable = (event: BlobEvent): void => {
          try {
            updateLastDataReceived(); // Update timestamp

            if (event.data && event.data.size > 0) {
              this.chunks.push(event.data);

              // Debug logging can be enabled by setting a flag in the constructor if needed
              // console.warn(`Received data chunk: ${event.data.size} bytes`);
            } else if (event.data && event.data.size === 0) {
              console.warn('Received empty data chunk from MediaRecorder');
            }
          } catch (dataError) {
            console.error('Error processing media data:', dataError);

            // Try to recover by requesting more data
            try {
              if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.requestData();
              }
            } catch (recoveryError) {
              console.warn('Failed to request additional data during recovery:', recoveryError);
            }
          }
        };

        // Enhanced error handling for MediaRecorder
        this.mediaRecorder.onerror = (event: Event): void => {
          console.error('MediaRecorder error:', event);

          // Try to recover from the error
          try {
            // Clear the heartbeat interval
            clearInterval(heartbeatInterval);

            // If we have chunks already, try to continue with what we have
            if (this.chunks.length > 0) {
              console.warn('Attempting to recover from MediaRecorder error...');

              // If the recorder is in a bad state, recreate it
              if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                try {
                  this.mediaRecorder.stop();
                } catch (stopError) {
                  console.warn('Error stopping failed MediaRecorder:', stopError);
                }
              }

              // Try to restart recording
              setTimeout((): void => {
                try {
                  this.start(stream);
                  console.warn('Successfully recovered from MediaRecorder error');
                } catch (restartError) {
                  console.error('Failed to restart recording after error:', restartError);
                }
              }, 500);
            }
          } catch (recoveryError) {
            console.error('Error during MediaRecorder error recovery:', recoveryError);
          }
        };

        // Handle recorder stopping unexpectedly
        this.mediaRecorder.onstop = (): void => {
          // Clear the heartbeat interval
          clearInterval(heartbeatInterval);
        };

        // Start recording with smaller timeslice for more frequent data collection
        // This helps ensure audio data is captured continuously and reduces the chance of gaps
        this.mediaRecorder.start(100); // Fire ondataavailable every 100ms for smoother audio

        console.warn('MediaRecorder started with optimized settings');
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    })();
  }

  /**
   * Stops recording and returns the recorded blob
   * @returns Promise resolving to the recorded Blob
   */
  public stop(): Promise<Blob> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return Promise.reject(new Error('Recording not in progress'));
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

  /**
   * Gets the current recording state
   * @returns The current recording state ('inactive', 'recording', or 'paused')
   */
  public getState(): string {
    return this.mediaRecorder ? this.mediaRecorder.state : 'inactive';
  }

  /**
   * Gets the recorded blob
   * @returns The recorded blob or null if no recording is available
   */
  public getRecordingBlob(): Blob | null {
    return this.recordingBlob;
  }

  /**
   * Gets the recorded chunks
   * @returns The recorded chunks
   */
  public getChunks(): Blob[] {
    return this.chunks;
  }

  /**
   * Disposes of the RecordingManager and releases resources
   */
  public dispose(): void {
    this.mediaRecorder = null;
    this.chunks = [];
    this.recordingBlob = null;
  }
}
