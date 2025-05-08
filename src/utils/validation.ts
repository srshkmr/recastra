/**
 * Validation utilities for Recastra
 */

/**
 * Validates that a blob exists and is not empty
 * @param blob - The blob to validate
 * @param errorMessage - Custom error message (optional)
 * @throws Error if the blob is null, undefined, or empty
 */
export function validateBlob(blob: Blob | null | undefined, errorMessage?: string): void {
  if (!blob) {
    throw new Error(errorMessage || 'No recording blob provided.');
  }
}

/**
 * Validates that a MediaStream exists
 * @param stream - The MediaStream to validate
 * @param errorMessage - Custom error message (optional)
 * @throws Error if the stream is null or undefined
 */
export function validateStream(
  stream: MediaStream | null | undefined,
  errorMessage?: string
): void {
  if (!stream) {
    throw new Error(errorMessage || 'Stream not provided. Provide a valid MediaStream.');
  }
}

/**
 * Validates that a MediaRecorder is active and in the expected state
 * @param recorder - The MediaRecorder to validate
 * @param expectedState - The expected state of the recorder ('recording', 'paused', or 'inactive')
 * @param errorMessage - Custom error message (optional)
 * @throws Error if the recorder is null, undefined, or not in the expected state
 */
export function validateRecorderState(
  recorder: MediaRecorder | null | undefined,
  expectedState: 'recording' | 'paused' | 'inactive',
  errorMessage?: string
): void {
  if (!recorder) {
    throw new Error(errorMessage || 'MediaRecorder not initialized.');
  }

  // Only check state if we're expecting a specific state
  if (recorder.state !== expectedState) {
    throw new Error(
      errorMessage ||
        `MediaRecorder is not in ${expectedState} state. Current state: ${recorder.state}`
    );
  }
}
