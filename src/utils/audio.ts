/**
 * Audio utilities for Recastra
 */

import { addTracksToStream } from './media';

/**
 * Converts an AudioBuffer to a WAV Blob
 * @param audioBuffer - The AudioBuffer to convert
 * @param mimeType - The MIME type for the output blob (default: 'audio/wav')
 * @returns A Blob containing the WAV data
 */
export function audioBufferToWav(audioBuffer: AudioBuffer, mimeType: string = 'audio/wav'): Blob {
  // WAV format specification: http://soundfile.sapp.org/doc/WaveFormat/

  const numOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM format (linear quantization)
  const bitDepth = 16; // 16 bits per sample
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numOfChannels * bytesPerSample;
  const bytesPerSecond = sampleRate * blockAlign;
  const dataLength = audioBuffer.length * numOfChannels * bytesPerSample;

  // Calculate the total file size (header + data)
  const fileSize = 44 + dataLength;

  // Create a buffer for the WAV file
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // Write the WAV header
  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true); // File size - 8 bytes
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Length of format data
  view.setUint16(20, format, true); // Format type (1 for PCM)
  view.setUint16(22, numOfChannels, true); // Number of channels
  view.setUint32(24, sampleRate, true); // Sample rate
  view.setUint32(28, bytesPerSecond, true); // Bytes per second
  view.setUint16(32, blockAlign, true); // Block align
  view.setUint16(34, bitDepth, true); // Bits per sample

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true); // Data length

  // Write the audio data
  let offset = 44;
  const channelData = [];

  // Extract the channel data
  for (let channel = 0; channel < numOfChannels; channel++) {
    channelData.push(audioBuffer.getChannelData(channel));
  }

  // Interleave the channel data and convert to 16-bit PCM
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numOfChannels; channel++) {
      // Convert float32 to int16
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16Sample, true);
      offset += 2;
    }
  }

  // Create a Blob from the buffer
  return new Blob([buffer], { type: mimeType });
}

// Helper function to write a string to a DataView
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Creates an AudioContext with optimal settings
 * @param options - Optional AudioContext options
 * @returns The created AudioContext
 */
export function createOptimizedAudioContext(options: AudioContextOptions = {}): AudioContext {
  // Create a new AudioContext with optimal settings for audio processing
  return new AudioContext({
    latencyHint: 'interactive', // Optimize for lower latency
    sampleRate: 48000, // Use high sample rate for better quality
    ...options
  });
}

/**
 * Creates a GainNode with smooth transition
 * @param audioContext - The AudioContext to use
 * @param gainValue - The gain value to set
 * @returns The created GainNode
 */
export function createGainNode(audioContext: AudioContext, gainValue: number): GainNode {
  // Create a GainNode for volume control with smoothing
  const gainNode = audioContext.createGain();

  // Set the gain value with a slight ramp to prevent clicks/pops
  const currentTime = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0, currentTime);
  gainNode.gain.linearRampToValueAtTime(gainValue, currentTime + 0.05);

  return gainNode;
}

/**
 * Creates a BiquadFilterNode for noise reduction
 * @param audioContext - The AudioContext to use
 * @param frequency - The frequency cutoff (default: 8000)
 * @returns The created BiquadFilterNode
 */
export function createNoiseFilter(
  audioContext: AudioContext,
  frequency: number = 8000
): BiquadFilterNode {
  // Create a BiquadFilterNode for noise reduction
  const filterNode = audioContext.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.value = frequency; // Reduce high-frequency noise
  return filterNode;
}

/**
 * Creates a DynamicsCompressorNode for evening out volume levels
 * @param audioContext - The AudioContext to use
 * @returns The created DynamicsCompressorNode
 */
export function createCompressor(audioContext: AudioContext): DynamicsCompressorNode {
  // Create a compressor to even out volume levels and prevent clipping
  const compressorNode = audioContext.createDynamicsCompressor();
  compressorNode.threshold.value = -24;
  compressorNode.knee.value = 30;
  compressorNode.ratio.value = 12;
  compressorNode.attack.value = 0.003;
  compressorNode.release.value = 0.25;
  return compressorNode;
}

/**
 * Creates a processed audio stream with gain, filtering, and compression
 * @param stream - The original MediaStream
 * @param audioContext - The AudioContext to use
 * @param gainValue - The gain value to apply
 * @returns The processed MediaStream
 */
export function createProcessedAudioStream(
  stream: MediaStream,
  audioContext: AudioContext,
  gainValue: number
): MediaStream {
  // Create a MediaStreamAudioSourceNode from the input stream
  const sourceNode = audioContext.createMediaStreamSource(stream);

  // Create audio processing nodes
  const filterNode = createNoiseFilter(audioContext);
  const compressorNode = createCompressor(audioContext);
  const gainNode = createGainNode(audioContext, gainValue);

  // Create a MediaStreamDestinationNode to output the processed audio
  const destinationNode = audioContext.createMediaStreamDestination();

  // Connect the nodes: source -> filter -> compressor -> gain -> destination
  sourceNode.connect(filterNode);
  filterNode.connect(compressorNode);
  compressorNode.connect(gainNode);
  gainNode.connect(destinationNode);

  // Create a new MediaStream with the processed audio track
  const processedStream = new MediaStream();

  // Add the processed audio track to the new stream with constraints to ensure stability
  destinationNode.stream.getAudioTracks().forEach(track => {
    // Set track constraints for stability
    if (track.applyConstraints) {
      track
        .applyConstraints({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false // We're handling gain manually
        })
        .catch(err => {
          console.warn('Failed to apply audio track constraints:', err);
        });
    }
    processedStream.addTrack(track);
  });

  // Add the original video tracks to the new stream (if any)
  addTracksToStream(stream, processedStream, 'video');

  return processedStream;
}
