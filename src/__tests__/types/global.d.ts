// Type definitions for Jest global object
// This file provides type definitions for the global object used in Jest tests

declare global {
  // Extend the NodeJS.Global interface to include Jest's global object
  var global: typeof globalThis;

  // Add browser API types that are mocked in tests
  interface Window {
    AudioContext: typeof AudioContext;
    MediaRecorder: typeof MediaRecorder;
    MediaStream: typeof MediaStream;
    MediaStreamTrack: typeof MediaStreamTrack;
    URL: {
      createObjectURL: (blob: Blob) => string;
      revokeObjectURL: (url: string) => void;
    };
  }
}

// This export is needed to make this file a module
export {};
