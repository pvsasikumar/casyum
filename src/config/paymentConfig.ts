/**
 * Central configuration for payment assets.
 *
 * The payment QR image is stored in the Vite `public` folder so it is copied
 * verbatim into the production build and served from the site root on both
 * local dev and Vercel. Paths are root-relative on purpose and must NOT use
 * local filesystem or absolute Windows paths.
 *
 * The file lives at `public/images/events/qr code.jpeg`. The space in the
 * filename is URL-encoded (`%20`) so the asset resolves correctly after
 * deployment.
 */
export const PAYMENT_CONFIG = {
  qrCodeImage: '/images/events/qr%20code.jpeg',
};
