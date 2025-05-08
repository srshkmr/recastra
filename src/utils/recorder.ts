/**
 * Recorder utilities for Recastra
 */

/**
 * Sets up a heartbeat to monitor recording health
 * @param mediaRecorder - The MediaRecorder to monitor
 * @param interval - The interval in milliseconds between heartbeats
 * @returns The interval ID for the heartbeat
 */
export function setupRecordingHeartbeat(
  mediaRecorder: MediaRecorder,
  interval: number = 2000
): ReturnType<typeof setInterval> {
  // Track the last time we received data to detect stalls
  let lastDataReceived = Date.now();

  // Set up a heartbeat to monitor recording health
  return setInterval((): void => {
    // If it's been more than 1 second since we received data, request data
    if (
      Date.now() - lastDataReceived > 1000 &&
      mediaRecorder &&
      mediaRecorder.state === 'recording'
    ) {
      try {
        // Request data to ensure we're still capturing
        mediaRecorder.requestData();
        console.warn('Heartbeat: requested data from MediaRecorder');
      } catch (heartbeatError) {
        console.warn('Heartbeat error:', heartbeatError);
      }
    }
  }, interval);
}

/**
 * Updates the last data received timestamp
 * @param timestamp - The timestamp to set (defaults to current time)
 * @returns The updated timestamp
 */
export function updateLastDataReceived(timestamp: number = Date.now()): number {
  return timestamp;
}

/**
 * Creates a MediaRecorder with optimized settings
 * @param stream - The MediaStream to record
 * @param mimeType - The MIME type to use
 * @param options - Additional MediaRecorder options
 * @param audioOnly - Whether to record audio only
 * @returns The created MediaRecorder
 */
export function createOptimizedRecorder(
  stream: MediaStream,
  mimeType: string,
  options: MediaRecorderOptions = {},
  audioOnly: boolean = false
): MediaRecorder {
  // Comprehensive default options for optimal audio quality and stability
  const defaultOptions = {
    audioBitsPerSecond: 128000,
    videoBitsPerSecond: audioOnly ? undefined : 2500000,
    // Use lower video bitrate for better stability if audio is the priority
    bitsPerSecond: audioOnly ? 128000 : 2800000
  };

  // Create the MediaRecorder with optimized options
  return new MediaRecorder(stream, {
    mimeType,
    ...defaultOptions,
    ...options
  });
}

/**
 * Stops a MediaRecorder and returns the recorded blob
 * @param mediaRecorder - The MediaRecorder to stop
 * @param chunks - The recorded chunks
 * @param mimeType - The MIME type of the recording
 * @param timeoutMs - The timeout in milliseconds
 * @returns Promise resolving to the recorded Blob
 */
export function stopRecorderWithTimeout(
  mediaRecorder: MediaRecorder,
  chunks: Blob[],
  mimeType: string,
  timeoutMs: number = 3000
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Request a final data chunk before stopping
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.requestData();
      }

      // Set up a timeout to ensure we don't hang if something goes wrong
      const timeoutId = setTimeout((): void => {
        console.warn('MediaRecorder stop timeout - forcing completion');
        if (chunks.length > 0) {
          const recordingBlob = new Blob(chunks, { type: mimeType });
          resolve(recordingBlob);
        } else {
          reject(new Error('No data collected during recording'));
        }
      }, timeoutMs);

      mediaRecorder.onstop = (): void => {
        clearTimeout(timeoutId);

        // Ensure we have valid chunks before creating the blob
        if (chunks.length > 0) {
          // Create the blob with proper MIME type and codecs
          const recordingBlob = new Blob(chunks, { type: mimeType });
          resolve(recordingBlob);
        } else {
          reject(new Error('No data collected during recording'));
        }
      };

      // Add error handler for stop operation
      mediaRecorder.onerror = (event: Event): void => {
        clearTimeout(timeoutId);
        console.error('Error stopping MediaRecorder:', event);
        reject(new Error('Error stopping recording'));
      };

      // Stop the recorder
      mediaRecorder.stop();
    } catch (error) {
      console.error('Exception during stop:', error);
      reject(
        error instanceof Error ? error : new Error(`Failed to stop recording: ${String(error)}`)
      );
    }
  });
}
