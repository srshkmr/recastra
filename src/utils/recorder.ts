/**
 * Recorder utilities for Recastra
 */

import {
  AUDIO_BITRATE,
  VIDEO_BITRATE,
  COMBINED_BITRATE,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_STALL_MS,
  RECORDER_STOP_TIMEOUT_MS
} from '../constants';
import { ERR_NO_DATA } from '../errors';

// tracks when we last received data, used by heartbeat to detect stalls
let lastDataTimestamp = Date.now();

export function setupRecordingHeartbeat(
  mediaRecorder: MediaRecorder,
  interval: number = HEARTBEAT_INTERVAL_MS
): ReturnType<typeof setInterval> {
  lastDataTimestamp = Date.now();

  return setInterval((): void => {
    const elapsed = Date.now() - lastDataTimestamp;
    if (elapsed > HEARTBEAT_STALL_MS && mediaRecorder && mediaRecorder.state === 'recording') {
      try {
        mediaRecorder.requestData();
        console.info('Heartbeat: requested data from MediaRecorder');
      } catch (err) {
        console.warn('Heartbeat error:', err);
      }
    }
  }, interval);
}

export function updateLastDataReceived(timestamp: number = Date.now()): void {
  lastDataTimestamp = timestamp;
}

export function getLastDataReceived(): number {
  return lastDataTimestamp;
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
  const defaultOptions = {
    audioBitsPerSecond: AUDIO_BITRATE,
    videoBitsPerSecond: audioOnly ? undefined : VIDEO_BITRATE,
    bitsPerSecond: audioOnly ? AUDIO_BITRATE : COMBINED_BITRATE
  };

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
  timeoutMs: number = RECORDER_STOP_TIMEOUT_MS
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
          resolve(new Blob(chunks, { type: mimeType }));
        } else {
          reject(new Error(ERR_NO_DATA));
        }
      }, timeoutMs);

      mediaRecorder.onstop = (): void => {
        clearTimeout(timeoutId);

        if (chunks.length > 0) {
          resolve(new Blob(chunks, { type: mimeType }));
        } else {
          reject(new Error(ERR_NO_DATA));
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
