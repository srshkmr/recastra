/**
 * Media utilities for Recastra
 */

import { HIGH_SAMPLE_RATE, STANDARD_SAMPLE_RATE, AUDIO_CHANNELS } from '../constants';

export interface MediaElementOptions {
  width?: string | number;
  height?: string | number;
  controls?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

function configureMediaElement<T extends HTMLMediaElement>(
  element: T,
  url: string,
  options?: MediaElementOptions
): void {
  element.src = url;
  element.controls = options?.controls ?? true;
  element.autoplay = options?.autoplay ?? false;
  element.loop = options?.loop ?? false;

  element.addEventListener('loadeddata', () => {
    console.info(`${element.tagName.toLowerCase()} loaded successfully`);
  });

  element.addEventListener('remove', () => {
    URL.revokeObjectURL(url);
  });
}

export function createVideoElement(
  blob: Blob,
  container?: HTMLElement,
  options?: MediaElementOptions
): HTMLVideoElement {
  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');

  configureMediaElement(video, url, options);
  video.muted = options?.muted ?? false;

  if (options?.width) {
    video.width = typeof options.width === 'number' ? options.width : parseInt(options.width, 10);
  }
  if (options?.height) {
    video.height =
      typeof options.height === 'number' ? options.height : parseInt(options.height, 10);
  }

  if (container) {
    container.appendChild(video);
  }

  return video;
}

export function createAudioElement(
  blob: Blob,
  container?: HTMLElement,
  options?: MediaElementOptions
): HTMLAudioElement {
  const url = URL.createObjectURL(blob);
  const audio = document.createElement('audio');

  configureMediaElement(audio, url, options);

  if (container) {
    container.appendChild(audio);
  }

  return audio;
}

/**
 * Stops all tracks in a MediaStream
 * @param stream - The MediaStream to stop
 */
export function stopMediaStreamTracks(stream: MediaStream): void {
  if (stream && typeof stream.getTracks === 'function') {
    stream.getTracks().forEach((track: MediaStreamTrack): void => track.stop());
  }
}

/**
 * Removes audio tracks from a MediaStream
 * @param stream - The MediaStream to remove audio tracks from
 */
export function removeAudioTracks(stream: MediaStream): void {
  if (stream) {
    stream.getAudioTracks().forEach((track: MediaStreamTrack): void => {
      stream.removeTrack(track);
      track.stop();
    });
  }
}

/**
 * Adds tracks from one MediaStream to another
 * @param sourceStream - The source MediaStream
 * @param targetStream - The target MediaStream
 * @param trackType - The type of tracks to add ('audio', 'video', or 'all')
 */
export function addTracksToStream(
  sourceStream: MediaStream,
  targetStream: MediaStream,
  trackType: 'audio' | 'video' | 'all' = 'all'
): void {
  if (!sourceStream || !targetStream) return;

  if (trackType === 'audio' || trackType === 'all') {
    sourceStream.getAudioTracks().forEach((track: MediaStreamTrack): void => {
      targetStream.addTrack(track);
    });
  }

  if (trackType === 'video' || trackType === 'all') {
    sourceStream.getVideoTracks().forEach((track: MediaStreamTrack): void => {
      targetStream.addTrack(track);
    });
  }
}

/**
 * Creates optimized audio constraints
 * @param baseConstraints - Base audio constraints
 * @param highQuality - Whether to use high quality audio settings
 * @returns Optimized audio constraints
 */
export function createAudioConstraints(
  baseConstraints: boolean | MediaTrackConstraints | undefined,
  highQuality: boolean = false
): MediaTrackConstraints {
  const defaultConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: highQuality ? HIGH_SAMPLE_RATE : STANDARD_SAMPLE_RATE,
    channelCount: AUDIO_CHANNELS
  };

  if (typeof baseConstraints !== 'object' || baseConstraints === null) {
    return defaultConstraints;
  }

  return {
    ...defaultConstraints,
    ...baseConstraints
  };
}
