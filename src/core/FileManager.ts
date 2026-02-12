/**
 * FileManager - Handles saving and uploading recordings
 */

import { validateBlob } from '../utils/validation';
import { getFileExtension, downloadBlob } from '../utils/file';
import { audioBufferToWav } from '../utils/audio';
import { ERR_NO_BLOB, ERR_INVALID_URL } from '../errors';

/**
 * Interface for FileManager options
 */
export interface FileManagerOptions {
  /**
   * Whether to record audio only
   */
  audioOnly?: boolean;
}

/**
 * FileManager class for handling saving and uploading recordings
 */
export class FileManager {
  private audioOnly: boolean = false;

  /**
   * Creates a new FileManager instance
   * @param options - Configuration options
   */
  constructor(options?: FileManagerOptions) {
    this.audioOnly = options?.audioOnly ?? false;
  }

  /**
   * Downloads the recording using a generated blob URL or just returns the blob
   * @param blob - The recording blob
   * @param mimeType - The MIME type of the recording
   * @param fileName - Optional file name (defaults to 'recording.[ext]')
   * @param download - Whether to trigger download (defaults to true)
   * @returns The recording blob
   */
  public save(blob: Blob, mimeType: string, fileName?: string, download: boolean = true): Blob {
    validateBlob(blob, ERR_NO_BLOB);

    // Get the appropriate file extension
    const fileExtension = getFileExtension(mimeType, this.audioOnly);

    // If download is true, create a download link and click it
    if (download) {
      void downloadBlob(blob, fileName || `recording.${fileExtension}`);
    }

    return blob;
  }

  /**
   * Saves the recording as audio only, extracting audio from video if necessary
   * Always saves in WAV format for maximum compatibility
   * @param blob - The recording blob
   * @param fileName - Optional file name (defaults to 'recording-audio.wav')
   * @param download - Whether to trigger download (defaults to true)
   * @returns The audio blob
   */
  public async saveAsAudio(blob: Blob, fileName?: string, download: boolean = true): Promise<Blob> {
    validateBlob(blob, ERR_NO_BLOB);

    try {
      const audioMimeType = 'audio/wav';
      const preferredExtension = 'wav';
      const audioBlob = await this.extractAudioStream(blob, audioMimeType);

      if (download) {
        const fileNameWithExt = fileName || `recording-audio.${preferredExtension}`;
        await downloadBlob(audioBlob, fileNameWithExt);
      }

      return audioBlob;
    } catch (error) {
      console.error('Error saving audio:', error);
      throw new Error('Failed to save audio recording');
    }
  }

  private async extractAudioStream(blob: Blob, mimeType: string): Promise<Blob> {
    try {
      // Convert the blob to an ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();

      // Create an AudioContext and decode the audio data
      const context = new AudioContext();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);

      // Convert the AudioBuffer directly to a WAV blob without real-time playback
      const audioBlob = audioBufferToWav(audioBuffer, mimeType);

      // Close the AudioContext to free up resources
      if (context.state !== 'closed') {
        await context.close();
      }

      return audioBlob;
    } catch (error) {
      console.error('Error extracting audio stream:', error);
      throw new Error('Failed to extract audio from recording');
    }
  }

  /**
   * Uploads the recording to a server via HTTP POST
   * @param blob - The recording blob
   * @param url - Server URL to upload to
   * @param formFieldName - Form field name (defaults to "file")
   * @returns Promise resolving to the server Response
   */
  public async upload(blob: Blob, url: string, formFieldName: string = 'file'): Promise<Response> {
    validateBlob(blob, ERR_NO_BLOB);

    if (!url) {
      throw new Error(ERR_INVALID_URL);
    }

    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid upload URL: ${url}`);
    }

    const formData = new FormData();
    formData.append(formFieldName, blob);

    try {
      return await fetch(url, {
        method: 'POST',
        body: formData
      });
    } catch (error) {
      console.error('Error uploading recording:', error);
      throw new Error('Failed to upload recording');
    }
  }
}
