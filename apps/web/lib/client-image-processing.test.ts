import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getImageDimensions, createWatermarkedPreview } from './client-image-processing';

// Test constants
const TEST_IMAGE_WIDTH = 3200;
const TEST_IMAGE_HEIGHT = 2400;
const EXPECTED_PREVIEW_WIDTH = 800; // Max dimension limit
const EXPECTED_PREVIEW_HEIGHT = 600; // Maintains aspect ratio
const PREVIEW_QUALITY = 0.33;

// Mock ImageBitmap
class MockImageBitmap {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  close() {
    // No-op
  }
}

// Mock canvas context
const createMockCanvasContext = () => {
  const mockContext = {
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    canvas: { toBlob: vi.fn() },
  };

  // Set properties that can't be set via object literal
  Object.defineProperties(mockContext, {
    font: { value: '', writable: true },
    fillStyle: { value: '', writable: true },
    textAlign: { value: 'left', writable: true },
    textBaseline: { value: 'alphabetic', writable: true },
  });

  return mockContext;
};

// Mock canvas element
const createMockCanvas = () => {
  const mockContext = createMockCanvasContext();
  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => mockContext),
    toBlob: vi.fn((callback: (blob: Blob) => void, type: string, quality: number) => {
      // Simulate successful blob creation
      const blob = new Blob(['watermarked-image-data'], { type });
      callback(blob);
    }),
  };

  return { mockCanvas, mockContext };
};

describe('client-image-processing', () => {
  beforeEach(() => {
    // Mock createImageBitmap global
    global.createImageBitmap = vi.fn();

    // Mock document.createElement for canvas
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        const { mockCanvas } = createMockCanvas();
        return mockCanvas as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getImageDimensions', () => {
    it('extracts width and height from image file', async () => {
      // Arrange
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBitmap = new MockImageBitmap(TEST_IMAGE_WIDTH, TEST_IMAGE_HEIGHT);
      vi.mocked(global.createImageBitmap).mockResolvedValue(mockBitmap as unknown as ImageBitmap);

      // Act
      const dimensions = await getImageDimensions(testFile);

      // Assert
      expect(dimensions).toEqual({
        width: TEST_IMAGE_WIDTH,
        height: TEST_IMAGE_HEIGHT,
      });
    });

    it('respects EXIF orientation when loading image', async () => {
      // Arrange
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBitmap = new MockImageBitmap(1920, 1080);
      vi.mocked(global.createImageBitmap).mockResolvedValue(mockBitmap as unknown as ImageBitmap);

      // Act
      await getImageDimensions(testFile);

      // Assert
      expect(global.createImageBitmap).toHaveBeenCalledWith(testFile, {
        imageOrientation: 'from-image',
      });
    });

    it('closes bitmap after extracting dimensions', async () => {
      // Arrange
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBitmap = new MockImageBitmap(1920, 1080);
      const closeSpy = vi.spyOn(mockBitmap, 'close');
      vi.mocked(global.createImageBitmap).mockResolvedValue(mockBitmap as unknown as ImageBitmap);

      // Act
      await getImageDimensions(testFile);

      // Assert
      expect(closeSpy).toHaveBeenCalled();
    });

    it('throws descriptive error when image loading fails', async () => {
      // Arrange
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      vi.mocked(global.createImageBitmap).mockRejectedValue(new Error('Invalid image'));

      // Act & Assert
      await expect(getImageDimensions(testFile)).rejects.toThrow('Failed to load image: Invalid image');
    });
  });

  describe('createWatermarkedPreview', () => {
    it('scales large image to max dimension of 800px', async () => {
      // Arrange
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBitmap = new MockImageBitmap(TEST_IMAGE_WIDTH, TEST_IMAGE_HEIGHT);
      vi.mocked(global.createImageBitmap).mockResolvedValue(mockBitmap as unknown as ImageBitmap);

      const { mockCanvas, mockContext } = createMockCanvas();
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);

      // Act
      await createWatermarkedPreview(testFile, { width: TEST_IMAGE_WIDTH, height: TEST_IMAGE_HEIGHT });

      // Assert - canvas should be sized to max dimension (800px width for landscape)
      expect(mockCanvas.width).toBe(EXPECTED_PREVIEW_WIDTH);
      expect(mockCanvas.height).toBe(EXPECTED_PREVIEW_HEIGHT);
    });

    it('uses 40% scale for images smaller than 800px', async () => {
      // Arrange
      const smallWidth = 1000;
      const smallHeight = 750;
      const expectedWidth = Math.round(smallWidth * 0.4); // 400
      const expectedHeight = Math.round(smallHeight * 0.4); // 300

      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBitmap = new MockImageBitmap(smallWidth, smallHeight);
      vi.mocked(global.createImageBitmap).mockResolvedValue(mockBitmap as unknown as ImageBitmap);

      const { mockCanvas } = createMockCanvas();
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);

      // Act
      await createWatermarkedPreview(testFile, { width: smallWidth, height: smallHeight });

      // Assert
      expect(mockCanvas.width).toBe(expectedWidth);
      expect(mockCanvas.height).toBe(expectedHeight);
    });

    it('draws watermark text diagonally at -45 degrees', async () => {
      // Arrange
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBitmap = new MockImageBitmap(TEST_IMAGE_WIDTH, TEST_IMAGE_HEIGHT);
      vi.mocked(global.createImageBitmap).mockResolvedValue(mockBitmap as unknown as ImageBitmap);

      const { mockCanvas, mockContext } = createMockCanvas();
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);

      // Act
      await createWatermarkedPreview(testFile, { width: TEST_IMAGE_WIDTH, height: TEST_IMAGE_HEIGHT });

      // Assert - verify rotation was applied
      const expectedAngle = -45 * (Math.PI / 180);
      expect(mockContext.rotate).toHaveBeenCalledWith(expectedAngle);
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('applies watermark text across entire image in grid pattern', async () => {
      // Arrange
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBitmap = new MockImageBitmap(TEST_IMAGE_WIDTH, TEST_IMAGE_HEIGHT);
      vi.mocked(global.createImageBitmap).mockResolvedValue(mockBitmap as unknown as ImageBitmap);

      const { mockCanvas, mockContext } = createMockCanvas();
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);

      // Act
      await createWatermarkedPreview(testFile, { width: TEST_IMAGE_WIDTH, height: TEST_IMAGE_HEIGHT });

      // Assert - verify fillText was called multiple times (grid pattern)
      expect(mockContext.fillText).toHaveBeenCalled();
      expect(mockContext.fillText.mock.calls.length).toBeGreaterThan(1);
    });

    it('compresses image to 33% quality', async () => {
      // Arrange
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBitmap = new MockImageBitmap(TEST_IMAGE_WIDTH, TEST_IMAGE_HEIGHT);
      vi.mocked(global.createImageBitmap).mockResolvedValue(mockBitmap as unknown as ImageBitmap);

      const { mockCanvas } = createMockCanvas();
      const toBlobSpy = vi.spyOn(mockCanvas, 'toBlob');
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);

      // Act
      await createWatermarkedPreview(testFile, { width: TEST_IMAGE_WIDTH, height: TEST_IMAGE_HEIGHT });

      // Assert
      expect(toBlobSpy).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        PREVIEW_QUALITY
      );
    });

    it('appends "-watermarked" to filename', async () => {
      // Arrange
      const testFile = new File(['test'], 'my-photo.jpg', { type: 'image/jpeg' });
      const mockBitmap = new MockImageBitmap(TEST_IMAGE_WIDTH, TEST_IMAGE_HEIGHT);
      vi.mocked(global.createImageBitmap).mockResolvedValue(mockBitmap as unknown as ImageBitmap);

      const { mockCanvas } = createMockCanvas();
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);

      // Act
      const result = await createWatermarkedPreview(testFile, { width: TEST_IMAGE_WIDTH, height: TEST_IMAGE_HEIGHT });

      // Assert
      expect(result.name).toBe('my-photo-watermarked.jpg');
    });

    it('preserves file type in watermarked preview', async () => {
      // Arrange
      const testFile = new File(['test'], 'test.png', { type: 'image/png' });
      const mockBitmap = new MockImageBitmap(TEST_IMAGE_WIDTH, TEST_IMAGE_HEIGHT);
      vi.mocked(global.createImageBitmap).mockResolvedValue(mockBitmap as unknown as ImageBitmap);

      const { mockCanvas } = createMockCanvas();
      const toBlobSpy = vi.spyOn(mockCanvas, 'toBlob');
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);

      // Act
      await createWatermarkedPreview(testFile, { width: TEST_IMAGE_WIDTH, height: TEST_IMAGE_HEIGHT });

      // Assert
      expect(toBlobSpy).toHaveBeenCalledWith(
        expect.any(Function),
        'image/png',
        PREVIEW_QUALITY
      );
    });

    it('throws error when canvas context is unavailable', async () => {
      // Arrange
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBitmap = new MockImageBitmap(TEST_IMAGE_WIDTH, TEST_IMAGE_HEIGHT);
      vi.mocked(global.createImageBitmap).mockResolvedValue(mockBitmap as unknown as ImageBitmap);

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => null),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);

      // Act & Assert
      await expect(
        createWatermarkedPreview(testFile, { width: TEST_IMAGE_WIDTH, height: TEST_IMAGE_HEIGHT })
      ).rejects.toThrow('Failed to get canvas context');
    });

    it('handles portrait orientation images correctly', async () => {
      // Arrange
      const portraitWidth = 1200;
      const portraitHeight = 1600;
      // 40% scale: 480 x 640 (smaller than max dimension 600 x 800)
      const expectedWidth = 480;
      const expectedHeight = 640;

      const testFile = new File(['test'], 'portrait.jpg', { type: 'image/jpeg' });
      const mockBitmap = new MockImageBitmap(portraitWidth, portraitHeight);
      vi.mocked(global.createImageBitmap).mockResolvedValue(mockBitmap as unknown as ImageBitmap);

      const { mockCanvas } = createMockCanvas();
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);

      // Act
      await createWatermarkedPreview(testFile, { width: portraitWidth, height: portraitHeight });

      // Assert
      expect(mockCanvas.width).toBe(expectedWidth);
      expect(mockCanvas.height).toBe(expectedHeight);
    });

    it('sets watermark font size to 4% of image width', async () => {
      // Arrange
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBitmap = new MockImageBitmap(TEST_IMAGE_WIDTH, TEST_IMAGE_HEIGHT);
      vi.mocked(global.createImageBitmap).mockResolvedValue(mockBitmap as unknown as ImageBitmap);

      const { mockCanvas, mockContext } = createMockCanvas();
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);

      // Act
      await createWatermarkedPreview(testFile, { width: TEST_IMAGE_WIDTH, height: TEST_IMAGE_HEIGHT });

      // Assert - 4% of 800px (preview width) = 32px
      const expectedFontSize = Math.round(EXPECTED_PREVIEW_WIDTH * 0.04);
      expect(mockContext.font).toContain(`${expectedFontSize}px`);
    });
  });
});
