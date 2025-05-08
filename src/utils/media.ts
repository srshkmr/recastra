/**
 * Media utilities for Recastra
 */

/**
 * Interface for media element options
 */
export interface MediaElementOptions {
  width?: string | number;
  height?: string | number;
  controls?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

/**
 * Creates a video element for a blob
 * @param blob - The blob to create a video element for
 * @param container - Optional container to append the video to
 * @param options - Optional video element options
 * @returns The created video element
 */
export function createVideoElement(
  blob: Blob,
  container?: HTMLElement,
  options?: MediaElementOptions
): HTMLVideoElement {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a video element
  const video = document.createElement('video');

  // Set default attributes
  video.src = url;
  video.controls = options?.controls !== undefined ? options.controls : true;
  video.autoplay = options?.autoplay !== undefined ? options.autoplay : false;
  video.muted = options?.muted !== undefined ? options.muted : false;
  video.loop = options?.loop !== undefined ? options.loop : false;

  // Set dimensions if provided
  if (options?.width) {
    video.width = typeof options.width === 'number' ? options.width : parseInt(options.width, 10);
  }
  if (options?.height) {
    video.height =
      typeof options.height === 'number' ? options.height : parseInt(options.height, 10);
  }

  // Add event listener to revoke the URL when the video is no longer needed
  video.addEventListener('loadeddata', () => {
    console.warn('Video loaded successfully');
  });

  // Clean up the URL when the video is removed from the DOM
  video.addEventListener('remove', () => {
    URL.revokeObjectURL(url);
  });

  // Append to container if provided
  if (container) {
    container.appendChild(video);
  }

  return video;
}

/**
 * Creates an audio element for a blob
 * @param blob - The blob to create an audio element for
 * @param container - Optional container to append the audio to
 * @param options - Optional audio element options
 * @returns The created audio element
 */
export function createAudioElement(
  blob: Blob,
  container?: HTMLElement,
  options?: MediaElementOptions
): HTMLAudioElement {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create an audio element
  const audio = document.createElement('audio');

  // Set default attributes
  audio.src = url;
  audio.controls = options?.controls !== undefined ? options.controls : true;
  audio.autoplay = options?.autoplay !== undefined ? options.autoplay : false;
  audio.loop = options?.loop !== undefined ? options.loop : false;

  // Add event listener to revoke the URL when the audio is no longer needed
  audio.addEventListener('loadeddata', () => {
    console.warn('Audio loaded successfully');
  });

  // Clean up the URL when the audio is removed from the DOM
  audio.addEventListener('remove', () => {
    URL.revokeObjectURL(url);
  });

  // Append to container if provided
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
  if (stream) {
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
  // Default constraints for all audio
  const defaultConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  };

  // Add high quality settings if requested
  if (highQuality) {
    defaultConstraints.sampleRate = 48000;
    defaultConstraints.channelCount = 2;
  } else {
    defaultConstraints.sampleRate = 44100;
    defaultConstraints.channelCount = 2;
  }

  // If baseConstraints is a boolean, return default constraints
  if (typeof baseConstraints === 'boolean' || baseConstraints === undefined) {
    return defaultConstraints;
  }

  // Merge base constraints with defaults, prioritizing base values
  return {
    ...defaultConstraints,
    ...baseConstraints,
    // Ensure these are set even if not provided in custom constraints
    echoCancellation: baseConstraints.echoCancellation ?? defaultConstraints.echoCancellation,
    noiseSuppression: baseConstraints.noiseSuppression ?? defaultConstraints.noiseSuppression,
    autoGainControl: baseConstraints.autoGainControl ?? defaultConstraints.autoGainControl
  };
}
