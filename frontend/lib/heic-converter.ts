/**
 * Convert HEIC/HEIF image to JPEG
 * @param file - The HEIC file to convert
 * @returns Promise<File> - The converted JPEG file
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  // Check if file is HEIC/HEIF
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif');

  if (!isHeic) {
    // Return original file if not HEIC
    return file;
  }

  try {
    // `heic2any` touches `window` while the module is evaluated, so it must
    // stay out of the server-rendered module graph. Only load it for an
    // actual HEIC file in the browser.
    const { default: heic2any } = await import('heic2any');

    // Convert HEIC to JPEG using heic2any
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9, // High quality conversion
    });

    // heic2any can return an array, get the first blob
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

    // Create a new File from the blob with JPEG extension
    const fileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    const convertedFile = new File([blob], fileName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    return convertedFile;
  } catch (error) {
    console.error('Error converting HEIC to JPEG:', error);
    // If conversion fails, return original file
    // User will see an error when trying to upload
    throw new Error('Không thể chuyển đổi file HEIC. Vui lòng thử lại hoặc chọn file khác.');
  }
}

/**
 * Check if a file is HEIC/HEIF format
 */
export function isHeicFile(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif')
  );
}

