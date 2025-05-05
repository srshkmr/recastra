import { FileManager } from '../core/FileManager';

describe('FileManager', () => {
  let fileManager: FileManager;

  beforeEach(() => {
    fileManager = new FileManager();
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Set up fake timers
    jest.useFakeTimers();
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
    it('should save the recording with default file name', () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockMimeType = 'video/webm';

      // Mock URL.createObjectURL
      const mockUrl = 'mock-url';
      URL.createObjectURL = jest.fn().mockReturnValue(mockUrl);
      URL.revokeObjectURL = jest.fn();

      // Mock document.createElement and appendChild
      const mockAnchor = {
        style: { display: 'none' },
        href: '',
        download: '',
        click: jest.fn()
      };
      document.createElement = jest.fn().mockReturnValue(mockAnchor);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      // Save the recording
      fileManager.save(mockBlob, mockMimeType);

      // Verify that URL.createObjectURL was called with the blob
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);

      // Verify that the anchor was created and configured
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.href).toBe(mockUrl);
      expect(mockAnchor.download).toBe('recording.webm');

      // Verify that the anchor was appended to the document body and clicked
      expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockAnchor.click).toHaveBeenCalled();

      // Verify that the anchor was removed and the URL was revoked
      jest.runAllTimers();
      expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });

    it('should save the recording with custom file name', () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockMimeType = 'video/webm';
      const fileName = 'custom-recording.webm';

      // Mock URL.createObjectURL
      const mockUrl = 'mock-url';
      URL.createObjectURL = jest.fn().mockReturnValue(mockUrl);
      URL.revokeObjectURL = jest.fn();

      // Mock document.createElement and appendChild
      const mockAnchor = {
        style: { display: 'none' },
        href: '',
        download: '',
        click: jest.fn()
      };
      document.createElement = jest.fn().mockReturnValue(mockAnchor);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      // Save the recording
      fileManager.save(mockBlob, mockMimeType, fileName);

      // Verify that the anchor was configured with the custom file name
      expect(mockAnchor.download).toBe(fileName);
    });

    it('should use appropriate file extension for audio-only recordings', () => {
      // Create a file manager with audioOnly=true
      const audioFileManager = new FileManager({ audioOnly: true });

      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockMimeType = 'audio/mp4';

      // Mock URL.createObjectURL
      const mockUrl = 'mock-url';
      URL.createObjectURL = jest.fn().mockReturnValue(mockUrl);
      URL.revokeObjectURL = jest.fn();

      // Mock document.createElement and appendChild
      const mockAnchor = {
        style: { display: 'none' },
        href: '',
        download: '',
        click: jest.fn()
      };
      document.createElement = jest.fn().mockReturnValue(mockAnchor);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      // Save the recording
      audioFileManager.save(mockBlob, mockMimeType);

      // Verify that the anchor was configured with the appropriate file extension
      expect(mockAnchor.download).toBe('recording.mp3');
    });

    it('should throw error if blob is not provided', () => {
      // Use null with type assertion to Blob to match the expected parameter type
      expect(() => fileManager.save(null as unknown as Blob, 'video/webm')).toThrow(
        'No recording blob provided'
      );
    });
  });

  describe('saveAsAudio', () => {
    it('should extract audio from the recording', () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);

      // Mock extractAudioFromRecording
      fileManager['extractAudioFromRecording'] = jest.fn();

      // Save as audio
      fileManager.saveAsAudio(mockBlob);

      // Verify that extractAudioFromRecording was called with the correct parameters
      expect(fileManager['extractAudioFromRecording']).toHaveBeenCalledWith(
        mockBlob,
        'audio/wav',
        'recording-audio.wav'
      );
    });

    it('should save as audio with custom file name', () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const fileName = 'custom-audio.wav';

      // Mock extractAudioFromRecording
      fileManager['extractAudioFromRecording'] = jest.fn();

      // Save as audio
      fileManager.saveAsAudio(mockBlob, fileName);

      // Verify that extractAudioFromRecording was called with the correct parameters
      expect(fileManager['extractAudioFromRecording']).toHaveBeenCalledWith(
        mockBlob,
        'audio/wav',
        fileName
      );
    });

    it('should throw error if blob is not provided', () => {
      // Use null with type assertion to Blob to match the expected parameter type
      expect(() => fileManager.saveAsAudio(null as unknown as Blob)).toThrow(
        'No recording blob provided'
      );
    });
  });

  describe('extractAudioFromRecording', () => {
    it('should extract audio from the recording', () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockMimeType = 'audio/wav';
      const fileName = 'recording-audio.wav';

      // Mock Blob constructor
      const mockAudioBlob = new Blob([mockBlob], { type: 'audio/wav' });
      global.Blob = jest.fn().mockImplementation(() => mockAudioBlob) as unknown as typeof Blob;

      // Mock URL.createObjectURL
      const mockUrl = 'mock-url';
      URL.createObjectURL = jest.fn().mockReturnValue(mockUrl);
      URL.revokeObjectURL = jest.fn();

      // Mock document.createElement and appendChild
      const mockAnchor = {
        style: { display: 'none' },
        href: '',
        download: '',
        click: jest.fn()
      };
      document.createElement = jest.fn().mockReturnValue(mockAnchor);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      // Extract audio
      fileManager['extractAudioFromRecording'](mockBlob, mockMimeType, fileName);

      // Verify that a new Blob was created with the correct MIME type
      expect(global.Blob).toHaveBeenCalledWith([mockBlob], { type: 'audio/wav' });

      // Verify that URL.createObjectURL was called with the new blob
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockAudioBlob);

      // Verify that the anchor was created and configured
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.href).toBe(mockUrl);
      expect(mockAnchor.download).toBe(fileName);

      // Verify that the anchor was appended to the document body and clicked
      expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockAnchor.click).toHaveBeenCalled();

      // Verify that the anchor was removed and the URL was revoked
      jest.runAllTimers();
      expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
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
