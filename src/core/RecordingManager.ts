/**
 * RecordingManager - Handles recording operations
 */

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
    if (!stream) {
      throw new Error('Stream not provided. Provide a valid MediaStream.');
    }

    this.chunks = [];

    try {
      // Comprehensive default options for optimal audio quality and stability
      const defaultOptions = {
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: this.audioOnly ? undefined : 2500000,
        // Use lower video bitrate for better stability if audio is the priority
        bitsPerSecond: this.audioOnly ? 128000 : 2800000
      };

      // Create the MediaRecorder with optimized options
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.mimeType,
        ...defaultOptions,
        ...this.recordingOptions
      });

      // Track the last time we received data to detect stalls
      let lastDataReceived = Date.now();

      // Set up a heartbeat to monitor recording health
      const heartbeatInterval = setInterval((): void => {
        // If it's been more than 1 second since we received data, request data
        if (
          Date.now() - lastDataReceived > 1000 &&
          this.mediaRecorder &&
          this.mediaRecorder.state === 'recording'
        ) {
          try {
            // Request data to ensure we're still capturing
            this.mediaRecorder.requestData();
            console.warn('Heartbeat: requested data from MediaRecorder');
          } catch (heartbeatError) {
            console.warn('Heartbeat error:', heartbeatError);
          }
        }
      }, 2000); // Check every 2 seconds

      // Handle data availability with improved error handling
      this.mediaRecorder.ondataavailable = (event: BlobEvent): void => {
        try {
          lastDataReceived = Date.now(); // Update timestamp

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
      return Promise.reject(new Error('Recording not in progress'));
    }

    return new Promise((resolve, reject) => {
      try {
        // Request a final data chunk before stopping
        if (this.mediaRecorder!.state !== 'inactive') {
          this.mediaRecorder!.requestData();
        }

        // Set up a timeout to ensure we don't hang if something goes wrong
        const timeoutId = setTimeout((): void => {
          console.warn('MediaRecorder stop timeout - forcing completion');
          if (this.chunks.length > 0) {
            this.recordingBlob = new Blob(this.chunks, { type: this.mimeType });
            resolve(this.recordingBlob);
          } else {
            reject(new Error('No data collected during recording'));
          }
        }, 3000); // 3 second timeout

        this.mediaRecorder!.onstop = (): void => {
          clearTimeout(timeoutId);

          // Ensure we have valid chunks before creating the blob
          if (this.chunks.length > 0) {
            // Create the blob with proper MIME type and codecs
            this.recordingBlob = new Blob(this.chunks, { type: this.mimeType });
            resolve(this.recordingBlob);
          } else {
            reject(new Error('No data collected during recording'));
          }
        };

        // Add error handler for stop operation
        this.mediaRecorder!.onerror = (event: Event): void => {
          clearTimeout(timeoutId);
          console.error('Error stopping MediaRecorder:', event);
          reject(new Error('Error stopping recording'));
        };

        // Stop the recorder
        this.mediaRecorder!.stop();
      } catch (error) {
        console.error('Exception during stop:', error);
        reject(
          error instanceof Error ? error : new Error(`Failed to stop recording: ${String(error)}`)
        );
      }
    });
  }

  /**
   * Pauses the recording session
   */
  public pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  /**
   * Resumes a paused recording session
   */
  public resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
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
