/**
 * DEVELOPMENT-ONLY diagnostic for validating the participant QR pipeline.
 *
 * It re-reads the rendered QR image (canvas/Image -> PNG -> File), decodes it
 * with the independent ZXing decoder shipped inside `html5-qrcode`, prints the
 * decoded value and compares it against the expected payload. It confirms the
 * QR is not empty, malformed, truncated or different from the expected token.
 *
 * This module is only ever invoked when `import.meta.env.DEV` is true. Vite
 * statically replaces `import.meta.env.DEV` with `false` in production builds,
 * so this code path — including every decoded value and log line — is removed
 * from the shipped bundle. Never use this in production logging.
 */
import { Html5Qrcode, type Html5QrcodeResult } from 'html5-qrcode';
import { encodeParticipantQR } from './qr';

export interface QRDiagResult {
  ok: boolean;
  decoded: string;
  expected: string;
  matches: boolean;
  format?: Html5QrcodeResult['result']['format'];
  error?: string;
}

/** Single shared decoder instance reused across diagnostics (never re-created). */
let diagInstance: Html5Qrcode | null = null;

function getDiagInstance(containerId: string): Html5Qrcode {
  if (!diagInstance) {
    diagInstance = new Html5Qrcode(containerId);
  }
  return diagInstance;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        resolve(new File([blob], 'casyum-qr-diag.png', { type: 'image/png' }));
      },
      'image/png'
    );
  });
}

/** Rasterize a canvas or a fully-loaded image element to a PNG file. */
async function elementToPng(input: HTMLCanvasElement | HTMLImageElement): Promise<File | null> {
  if (input instanceof HTMLCanvasElement) {
    return canvasToPng(input);
  }
  const width = input.naturalWidth || input.width;
  const height = input.naturalHeight || input.height;
  if (!width || !height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(input, 0, 0, width, height);
  return canvasToPng(canvas);
}

export async function decodeQRCImage(
  input: HTMLCanvasElement | HTMLImageElement,
  containerId: string,
  participantId?: string
): Promise<QRDiagResult> {
  const expected = encodeParticipantQR(participantId || '');
  const file = await elementToPng(input);
  if (!file) {
    return { ok: false, decoded: '', expected, matches: false, error: 'Could not rasterize the QR canvas to a PNG image.' };
  }
  try {
    const instance = getDiagInstance(containerId);
    const result = await instance.scanFileV2(file, false);
    const decoded = result.decodedText;
    return {
      ok: true,
      decoded,
      expected,
      matches: Boolean(expected) && decoded === expected,
      format: result.result.format,
    };
  } catch (err: any) {
    return {
      ok: false,
      decoded: '',
      expected,
      matches: false,
      error: String(err?.message || err),
    };
  }
}
