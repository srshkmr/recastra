/**
 * Recastra - A lightweight TypeScript plugin for recording audio and video using WebRTC
 */

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
}

/**
 * Main Recastra class for handling WebRTC recording
 */
export class Recastra {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mimeType: string = 'video/webm';
  private recordingOptions: MediaRecorderOptions = {};
  private recordingBlob: Blob | null = null;
  
  /**
   * Creates a new Recastra instance
   * @param options - Configuration options
   */
  constructor(options?: RecastraOptions) {
    if (options?.mimeType) {
      this.setMimeType(options.mimeType);
    }
    
    if (options?.recordingOptions) {
      this.recordingOptions = options.recordingOptions;
    }
  }
  
  /**
   * Initializes the recorder with default constraints
   */
  public async init(): Promise<void> {
    return this.init({ audio: true, video: true });
  }
  
  /**
   * Initializes the recorder with custom constraints
   * @param constraints - MediaStreamConstraints for audio/video
   */
  public async init(constraints: MediaStreamConstraints): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Failed to initialize media stream');
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
   * Starts recording
   */
  public start(): void {
    if (!this.stream) {
      throw new Error('Stream not initialized. Call init() first.');
    }
    
    this.chunks = [];
    
    try {
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.mimeType,
        ...this.recordingOptions
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };
      
      this.mediaRecorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to start recording');
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
    
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        this.recordingBlob = new Blob(this.chunks, { type: this.mimeType });
        resolve(this.recordingBlob);
      };
      
      this.mediaRecorder!.stop();
    });
  }
  
  /**
   * Updates the stream with new constraints without stopping recording
   * @param constraints - New MediaStreamConstraints
   */
  public async updateStream(constraints: MediaStreamConstraints): Promise<void> {
    const wasRecording = this.mediaRecorder?.state === 'recording';
    
    if (wasRecording) {
      await this.stop();
    }
    
    // Stop all tracks in the current stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    // Get new stream with updated constraints
    await this.init(constraints);
    
    if (wasRecording) {
      this.start();
    }
  }
  
  /**
   * Returns the current active MediaStream
   */
  public getStream(): MediaStream {
    if (!this.stream) {
      throw new Error('Stream not initialized. Call init() first.');
    }
    return this.stream;
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
   * Downloads the recording using a generated blob URL
   * @param fileName - Optional file name (defaults to 'recording.[ext]')
   */
  public save(fileName?: string): void {
    if (!this.recordingBlob) {
      throw new Error('No recording available. Record something first.');
    }
    
    const url = URL.createObjectURL(this.recordingBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    // Determine file extension from MIME type
    const fileExtension = this.mimeType.split('/')[1] || 'webm';
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
   * Uploads the recording to a server via HTTP POST
   * @param url - Server URL to upload to
   * @param formFieldName - Form field name (defaults to "file")
   * @returns Promise resolving to the server Response
   */
  public async upload(url: string, formFieldName: string = 'file'): Promise<Response> {
    if (!this.recordingBlob) {
      throw new Error('No recording available. Record something first.');
    }
    
    const formData = new FormData();
    formData.append(formFieldName, this.recordingBlob);
    
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
  
  /**
   * Cleans up resources when the recorder is no longer needed
   */
  public dispose(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.chunks = [];
    this.recordingBlob = null;
  }
}