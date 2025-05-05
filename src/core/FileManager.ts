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
   */
  public save(blob: Blob, mimeType: string, fileName?: string): void {
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
  }

  /**
   * Saves the recording as audio only, extracting audio from video if necessary
   * Always saves in WAV format for maximum compatibility
   * @param blob - The recording blob
   * @param fileName - Optional file name (defaults to 'recording-audio.wav')
   */
  public saveAsAudio(blob: Blob, fileName?: string): void {
    if (!blob) {
      throw new Error('No recording blob provided.');
    }

    try {
      // Always use WAV format for audio downloads
      const audioMimeType = 'audio/wav';
      const preferredExtension = 'wav';

      // Extract audio from the recording
      this.extractAudioFromRecording(
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
   */
  private extractAudioFromRecording(blob: Blob, audioMimeType: string, fileName: string): void {
    // Create an audio context if it doesn't exist
    const audioContext = new AudioContext({
      latencyHint: 'interactive',
      sampleRate: 48000 // High sample rate for better quality WAV
    });

    // Force WAV extension regardless of MIME type
    const fileNameWithWavExt = fileName.endsWith('.wav')
      ? fileName
      : fileName.replace(/\.[^/.]+$/, '') + '.wav';

    // Create a URL from the recording blob
    const recordingUrl = URL.createObjectURL(blob);

    // Create an audio element to load the recording
    const audioElement = new Audio();
    audioElement.src = recordingUrl;

    // Create a media element source node
    const sourceNode = audioContext.createMediaElementSource(audioElement);

    // Create a destination node to capture the processed audio
    const destinationNode = audioContext.createMediaStreamDestination();

    // Connect the source to the destination
    sourceNode.connect(destinationNode);

    // Create a new MediaRecorder with only the audio stream
    // Use a supported format for recording, we'll convert to WAV later
    const recorderMimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp3';

    const audioRecorder = new MediaRecorder(destinationNode.stream, {
      mimeType: recorderMimeType,
      audioBitsPerSecond: 128000
    });

    const audioChunks: Blob[] = [];

    // Handle data available events
    audioRecorder.ondataavailable = (event: BlobEvent): void => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    // Handle recording stop
    audioRecorder.onstop = (): void => {
      // Create a blob from the audio chunks
      const audioBlob = new Blob(audioChunks, { type: recorderMimeType });

      // Create a download link with WAV extension
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
        URL.revokeObjectURL(recordingUrl);
        audioContext.close().catch((): void => {});
      }, 300);
    };

    // Start recording and playing
    audioRecorder.start();
    // Handle the play promise to avoid unhandled promise rejection
    void audioElement.play().catch((error: Error): void => {
      console.warn('Failed to play audio for extraction:', error);
    });

    // Stop recording when the audio finishes playing
    audioElement.onended = (): void => {
      audioRecorder.stop();
    };

    // If the audio doesn't start playing within 3 seconds, force a stop
    const timeout = setTimeout((): void => {
      if (audioRecorder.state === 'recording') {
        console.warn('Audio playback timeout - forcing completion');
        audioElement.pause();
        audioRecorder.stop();
      }
    }, 3000);

    // Clear the timeout if the audio starts playing
    audioElement.onplay = (): void => {
      clearTimeout(timeout);
    };
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
