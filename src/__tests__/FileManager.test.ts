import { FileManager } from '../core/FileManager';

describe('FileManager', () => {
  let fileManager: FileManager;

  beforeEach(() => {
    fileManager = new FileManager();
    // Clear all mocks before each test
    jest.clearAllMocks();
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

      // Mock AudioContext and its methods
      const mockSourceNode = {
        connect: jest.fn()
      };

      const mockDestinationNode = {
        stream: {
          getAudioTracks: jest.fn().mockReturnValue([{ kind: 'audio' }])
        }
      };

      const mockAudioContext = {
        createMediaElementSource: jest.fn().mockReturnValue(mockSourceNode),
        createMediaStreamDestination: jest.fn().mockReturnValue(mockDestinationNode),
        close: jest.fn().mockResolvedValue(undefined)
      };

      // Mock global AudioContext constructor
      global.AudioContext = jest
        .fn()
        .mockImplementation(() => mockAudioContext) as unknown as typeof AudioContext;

      // Mock URL.createObjectURL
      const mockUrl = 'mock-url';
      URL.createObjectURL = jest.fn().mockReturnValue(mockUrl);
      URL.revokeObjectURL = jest.fn();

      // Mock Audio constructor
      const mockAudio = {
        src: '',
        play: jest.fn(),
        pause: jest.fn(),
        onended: null,
        onplay: null
      };
      global.Audio = jest.fn().mockImplementation(() => mockAudio) as unknown as typeof Audio;

      // Mock MediaRecorder
      const mockMediaRecorder = {
        start: jest.fn(),
        stop: jest.fn(),
        ondataavailable: null,
        onstop: null,
        state: 'recording'
      };
      global.MediaRecorder = jest
        .fn()
        .mockImplementation(() => mockMediaRecorder) as unknown as typeof MediaRecorder;
      global.MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true);

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

      // Verify that AudioContext was created
      expect(global.AudioContext).toHaveBeenCalled();

      // Verify that URL.createObjectURL was called with the blob
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);

      // Verify that Audio was created and configured
      expect(global.Audio).toHaveBeenCalled();
      expect(mockAudio.src).toBe(mockUrl);

      // Verify that MediaRecorder was created and started
      expect(global.MediaRecorder).toHaveBeenCalled();
      expect(mockMediaRecorder.start).toHaveBeenCalled();

      // Verify that the audio was played
      expect(mockAudio.play).toHaveBeenCalled();

      // Simulate the audio ending
      mockMediaRecorder.onstop = jest.fn();
      mockAudio.onended();

      // Verify that the MediaRecorder was stopped
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });
  });

  describe('upload', () => {
    it('should upload the recording to a server', async () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      const mockUrl = 'https://example.com/upload';
      const mockFormFieldName = 'file';

      // Mock fetch
      const mockResponse = { ok: true };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      global.FormData = jest.fn().mockImplementation(() => ({
        append: jest.fn()
      }));

      // Upload the recording
      const response = await fileManager.upload(mockBlob, mockUrl, mockFormFieldName);

      // Verify that fetch was called with the correct parameters
      expect(global.fetch).toHaveBeenCalledWith(mockUrl, {
        method: 'POST',
        body: expect.any(FormData)
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
