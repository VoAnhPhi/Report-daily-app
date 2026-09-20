import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';

export interface QuillDelta {
  ops: any[];
}

export interface QuillOps extends Array<any> {}

/**
 * Converts Quill delta format to HTML string
 * Accepts either { ops: [...] } object or direct ops array
 */
export function convertDeltaToHtmlUtil(
  deltaOrOps: QuillDelta | QuillOps,
): string {
  try {
    // Handle both { ops: [...] } and direct [...] formats
    const ops = Array.isArray(deltaOrOps) ? deltaOrOps : deltaOrOps.ops;

    if (!Array.isArray(ops)) {
      throw new Error('Invalid Quill delta format: expected ops array');
    }

    const converter = new QuillDeltaToHtmlConverter(ops);
    return converter.convert();
  } catch (error) {
    console.error('Error converting Quill delta to HTML:', error);
    throw new Error(`Failed to convert Quill delta to HTML: ${error.message}`);
  }
}
