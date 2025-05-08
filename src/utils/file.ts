/**
 * File utilities for Recastra
 */

/**
 * Determines the appropriate file extension based on MIME type and recording mode
 * @param mimeType - The MIME type of the recording
 * @param audioOnly - Whether the recording is audio only
 * @returns The appropriate file extension
 */
export function getFileExtension(mimeType: string, audioOnly: boolean): string {
  // Determine file extension from MIME type
  let fileExtension = mimeType.split('/')[1] || 'webm';

  // Use appropriate file extension based on recording type
  if (audioOnly) {
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

  return fileExtension;
}

/**
 * Creates a download link for a blob and triggers the download
 * @param blob - The blob to download
 * @param fileName - The file name to use
 * @returns Promise that resolves when the download is triggered
 */
export function downloadBlob(blob: Blob, fileName: string): Promise<void> {
  return new Promise<void>(resolve => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, 100);
  });
}

/**
 * Creates a URL for a blob
 * @param blob - The blob to create a URL for
 * @returns The URL for the blob
 */
export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revokes a blob URL
 * @param url - The URL to revoke
 */
export function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}
