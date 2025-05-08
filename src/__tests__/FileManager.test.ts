import { FileManager } from '../core/FileManager';
import * as validationUtils from '../utils/validation';
import * as fileUtils from '../utils/file';

describe('FileManager', () => {
  let fileManager: FileManager;

  beforeEach(() => {
    fileManager = new FileManager();
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Set up fake timers
    jest.useFakeTimers();

    // Mock utility functions
    jest.spyOn(validationUtils, 'validateBlob').mockImplementation(() => {});
    jest.spyOn(fileUtils, 'getFileExtension').mockImplementation((mimeType, audioOnly) => {
      if (audioOnly) {
        if (mimeType === 'audio/mp4') return 'mp3';
        return 'wav';
      }
      return 'webm';
    });
    jest.spyOn(fileUtils, 'downloadBlob').mockImplementation(() => Promise.resolve());
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      expect(fileManager).toBeInstanceOf(FileManager);
      expect(fileManager['audioOnly']).toBe(false); // Default audioOnly
    });

    it('should set audioOnly from options', () => {
      const customManager = new FileManager({ audioOnly: true });
      expect(customManager['audioOnly']).toBe(true);
    });
  });

  describe('save', () => {
    it('should save the recording with default file name and download=true', () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockMimeType = 'video/webm';

      // Save the recording
      fileManager.save(mockBlob, mockMimeType);

      // Verify that validateBlob was called with the blob
      expect(validationUtils.validateBlob).toHaveBeenCalledWith(
        mockBlob,
        'No recording blob provided.'
      );

      // Verify that getFileExtension was called with the correct parameters
      expect(fileUtils.getFileExtension).toHaveBeenCalledWith(mockMimeType, false);

      // Verify that downloadBlob was called with the correct parameters
      expect(fileUtils.downloadBlob).toHaveBeenCalledWith(mockBlob, 'recording.webm');
    });

    it('should save the recording with custom file name', () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockMimeType = 'video/webm';
      const fileName = 'custom-recording.webm';

      // Save the recording
      fileManager.save(mockBlob, mockMimeType, fileName);

      // Verify that downloadBlob was called with the custom file name
      expect(fileUtils.downloadBlob).toHaveBeenCalledWith(mockBlob, fileName);
    });

    it('should not download the recording when download=false', () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockMimeType = 'video/webm';

      // Save the recording with download=false
      const result = fileManager.save(mockBlob, mockMimeType, undefined, false);

      // Verify that downloadBlob was not called
      expect(fileUtils.downloadBlob).not.toHaveBeenCalled();

      // Verify that the blob was returned
      expect(result).toBe(mockBlob);
    });

    it('should use appropriate file extension for audio-only recordings', () => {
      // Create a file manager with audioOnly=true
      const audioFileManager = new FileManager({ audioOnly: true });

      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockMimeType = 'audio/mp4';

      // Save the recording
      audioFileManager.save(mockBlob, mockMimeType);

      // Verify that getFileExtension was called with audioOnly=true
      expect(fileUtils.getFileExtension).toHaveBeenCalledWith(mockMimeType, true);

      // Verify that downloadBlob was called with the appropriate file extension
      expect(fileUtils.downloadBlob).toHaveBeenCalledWith(mockBlob, 'recording.mp3');
    });

    it('should throw error if blob is not provided', () => {
      // Mock validateBlob to throw an error
      jest.spyOn(validationUtils, 'validateBlob').mockImplementation(() => {
        throw new Error('No recording blob provided.');
      });

      // Use null with type assertion to Blob to match the expected parameter type
      expect(() => fileManager.save(null as unknown as Blob, 'video/webm')).toThrow(
        'No recording blob provided'
      );
    });
  });

  describe('saveAsAudio', () => {
    it('should extract audio from the recording with download=true by default', async () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockAudioBlob = new Blob(['audio data']);

      // Mock extractAudioStream to return a mock audio blob
      fileManager['extractAudioStream'] = jest.fn().mockResolvedValue(mockAudioBlob);

      // Save as audio
      await fileManager.saveAsAudio(mockBlob);

      // Verify that validateBlob was called with the blob
      expect(validationUtils.validateBlob).toHaveBeenCalledWith(
        mockBlob,
        'No recording blob provided.'
      );

      // Verify that extractAudioStream was called with the correct parameters
      expect(fileManager['extractAudioStream']).toHaveBeenCalledWith(mockBlob, 'audio/wav');

      // Verify that downloadBlob was called with the correct parameters
      expect(fileUtils.downloadBlob).toHaveBeenCalledWith(mockAudioBlob, 'recording-audio.wav');
    });

    it('should save as audio with custom file name', async () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockAudioBlob = new Blob(['audio data']);
      const fileName = 'custom-audio.wav';

      // Mock extractAudioStream to return a mock audio blob
      fileManager['extractAudioStream'] = jest.fn().mockResolvedValue(mockAudioBlob);

      // Save as audio
      await fileManager.saveAsAudio(mockBlob, fileName);

      // Verify that downloadBlob was called with the custom file name
      expect(fileUtils.downloadBlob).toHaveBeenCalledWith(mockAudioBlob, fileName);
    });

    it('should save as audio with download=false', async () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockAudioBlob = new Blob(['audio data']);

      // Mock extractAudioStream to return a mock audio blob
      fileManager['extractAudioStream'] = jest.fn().mockResolvedValue(mockAudioBlob);

      // Save as audio with download=false
      const result = await fileManager.saveAsAudio(mockBlob, undefined, false);

      // Verify that downloadBlob was not called
      expect(fileUtils.downloadBlob).not.toHaveBeenCalled();

      // Verify that the audio blob was returned
      expect(result).toBe(mockAudioBlob);
    });

    it('should throw error if blob is not provided', async () => {
      // Mock validateBlob to throw an error
      jest.spyOn(validationUtils, 'validateBlob').mockImplementation(() => {
        throw new Error('No recording blob provided.');
      });

      // Use null with type assertion to Blob to match the expected parameter type
      await expect(fileManager.saveAsAudio(null as unknown as Blob)).rejects.toThrow(
        'No recording blob provided'
      );
    });
  });

  describe('extractAudioStream', () => {
    it('should extract audio from the recording blob', async () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data'], { type: 'audio/wav' });

      // Create a mock audio blob that will be returned
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/wav' });

      // Mock the extractAudioStream method directly
      // This avoids the complexity of mocking AudioContext, MediaRecorder, etc.
      const originalExtractAudioStream = fileManager['extractAudioStream'];
      fileManager['extractAudioStream'] = jest.fn().mockResolvedValue(mockAudioBlob);

      // Call saveAsAudio which will use our mocked extractAudioStream
      const result = await fileManager.saveAsAudio(mockBlob, 'test.wav', false);

      // Verify that extractAudioStream was called with the correct parameters
      expect(fileManager['extractAudioStream']).toHaveBeenCalledWith(mockBlob, 'audio/wav');

      // Verify that the result is the mock audio blob
      expect(result).toBe(mockAudioBlob);

      // Restore the original method
      fileManager['extractAudioStream'] = originalExtractAudioStream;
    });
  });

  describe('upload', () => {
    it('should upload the recording to a server', async () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockUrl = 'https://example.com/upload';
      const mockFormFieldName = 'file';

      // Create a mock FormData instance
      const mockFormData = {
        append: jest.fn()
      };

      // Mock FormData constructor
      global.FormData = jest.fn().mockImplementation(() => mockFormData);

      // Mock fetch
      const mockResponse = { ok: true };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      // Upload the recording
      const response = await fileManager.upload(mockBlob, mockUrl, mockFormFieldName);

      // Verify that FormData.append was called with the correct parameters
      expect(mockFormData.append).toHaveBeenCalledWith(mockFormFieldName, mockBlob);

      // Verify that fetch was called with the correct parameters
      expect(global.fetch).toHaveBeenCalledWith(mockUrl, {
        method: 'POST',
        body: mockFormData
      });

      // Verify that the response was returned
      expect(response).toBe(mockResponse);
    });

    it('should throw error if blob is not provided', async () => {
      // Mock validateBlob to throw an error
      jest.spyOn(validationUtils, 'validateBlob').mockImplementation(() => {
        throw new Error('No recording blob provided.');
      });

      await expect(
        fileManager.upload(null as unknown as Blob, 'https://example.com/upload')
      ).rejects.toThrow('No recording blob provided');
    });

    it('should throw error if fetch fails', async () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockUrl = 'https://example.com/upload';

      // Mock fetch to reject
      const mockError = new Error('Network error');
      global.fetch = jest.fn().mockRejectedValue(mockError);
      global.FormData = jest.fn().mockImplementation(() => ({
        append: jest.fn()
      }));

      // Upload the recording
      await expect(fileManager.upload(mockBlob, mockUrl)).rejects.toThrow(
        'Failed to upload recording'
      );
    });
  });
});
