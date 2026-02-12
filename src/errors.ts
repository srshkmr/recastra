// stream
export const ERR_STREAM_NOT_INIT = 'Stream not initialized. Call init() first.';
export const ERR_STREAM_NOT_PROVIDED = 'Stream not provided. Provide a valid MediaStream.';

// recording
export const ERR_NO_RECORDING = 'No recording available. Record something first.';
export const ERR_NO_BLOB = 'No recording blob provided.';
export const ERR_NOT_RECORDING = 'Recording not in progress';
export const ERR_NO_DATA = 'No data collected during recording';

// media
export const ERR_MEDIA_TIMEOUT = 'Media access timeout - user may not have granted permissions';

// validation
export const ERR_GAIN_POSITIVE = 'Gain must be greater than 0';
export const ERR_INVALID_URL = 'Upload URL must be a non-empty string';
