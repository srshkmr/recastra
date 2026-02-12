/**
 * File utilities for Recastra
 */

const AUDIO_EXTENSION_MAP: Record<string, string> = {
  webm: 'webm',
  mp4: 'mp3',
  ogg: 'ogg'
};

const VIDEO_EXTENSIONS = new Set(['webm', 'mp4', 'ogg']);

/**
 * Determines the appropriate file extension based on MIME type and recording mode
 */
export function getFileExtension(mimeType: string, audioOnly: boolean): string {
  const ext = mimeType.split('/')[1] || 'webm';

  if (audioOnly) {
    return AUDIO_EXTENSION_MAP[ext] ?? 'wav';
  }

  return VIDEO_EXTENSIONS.has(ext) ? ext : 'webm';
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
