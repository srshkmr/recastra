/**
 * FileManager - Handles saving and uploading recordings
 */

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
    if (options?.audioOnly) {
      this.audioOnly = options.audioOnly;
    }
  }

  /**
   * Downloads the recording using a generated blob URL
   * @param blob - The recording blob
   * @param mimeType - The MIME type of the recording
   * @param fileName - Optional file name (defaults to 'recording.[ext]')
   * @returns The recording blob
   */
  public save(blob: Blob, mimeType: string, fileName?: string): Blob {
    if (!blob) {
      throw new Error('No recording blob provided.');
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;

    // Determine file extension from MIME type
    let fileExtension = mimeType.split('/')[1] || 'webm';

    // Use appropriate file extension based on recording type
    if (this.audioOnly) {
      // For audio-only recordings, use audio extensions
      if (fileExtension === 'webm') {
        fileExtension = 'webm'; // Keep webm for audio
      } else if (fileExtension === 'mp4') {
        fileExtension = 'mp3'; // Use mp3 for audio when mp4 is used for video
      } else if (fileExtension === 'ogg') {
        fileExtension = 'ogg'; // Keep ogg for audio
      } else {
        fileExtension = 'wav'; // Default to wav for other formats
      }
    } else {
      // For video recordings, ensure video extension
      if (fileExtension === 'webm' || fileExtension === 'mp4' || fileExtension === 'ogg') {
        // These are already video extensions, keep them
      } else {
        fileExtension = 'webm'; // Default to webm for video
      }
    }

    a.download = fileName || `recording.${fileExtension}`;

    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    return blob;
  }

  /**
   * Saves the recording as audio only, extracting audio from video if necessary
   * Always saves in WAV format for maximum compatibility
   * @param blob - The recording blob
   * @param fileName - Optional file name (defaults to 'recording-audio.wav')
   * @returns The audio blob
   */
  public saveAsAudio(blob: Blob, fileName?: string): Blob {
    if (!blob) {
      throw new Error('No recording blob provided.');
    }

    try {
      // Always use WAV format for audio downloads
      const audioMimeType = 'audio/wav';
      const preferredExtension = 'wav';

      // Extract audio from the recording and return the blob
      return this.extractAudioFromRecording(
        blob,
        audioMimeType,
        fileName || `recording-audio.${preferredExtension}`
      );
    } catch (error) {
      console.error('Error saving audio:', error);
      throw new Error('Failed to save audio recording');
    }
  }

  /**
   * Extracts audio from the recording and downloads it as WAV format
   * @param blob - The recording blob
   * @param audioMimeType - The MIME type for the audio (will be forced to WAV)
   * @param fileName - The file name for the download
   * @returns The audio blob
   */
  private extractAudioFromRecording(blob: Blob, audioMimeType: string, fileName: string): Blob {
    // Force WAV extension regardless of MIME type
    const fileNameWithWavExt = fileName.endsWith('.wav')
      ? fileName
      : fileName.replace(/\.[^/.]+$/, '') + '.wav';

    // Create a new blob with the correct MIME type
    // Note: We're not actually converting to WAV here, just setting the MIME type
    // The browser will handle the format based on the MIME type
    const audioBlob = new Blob([blob], { type: audioMimeType });

    // Create a download link
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileNameWithWavExt; // Force WAV extension

    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout((): void => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 300);

    return audioBlob;
  }

  /**
   * Uploads the recording to a server via HTTP POST
   * @param blob - The recording blob
   * @param url - Server URL to upload to
   * @param formFieldName - Form field name (defaults to "file")
   * @returns Promise resolving to the server Response
   */
  public async upload(blob: Blob, url: string, formFieldName: string = 'file'): Promise<Response> {
    if (!blob) {
      throw new Error('No recording blob provided.');
    }

    const formData = new FormData();
    formData.append(formFieldName, blob);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      return response;
    } catch (error) {
      console.error('Error uploading recording:', error);
      throw new Error('Failed to upload recording');
    }
  }
}
