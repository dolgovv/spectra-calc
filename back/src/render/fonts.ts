import { join } from 'node:path';
import { GlobalFonts } from '@napi-rs/canvas';

/**
 * Bundled Cyrillic-capable font (Liberation Sans, Arial-metric-compatible).
 * The app is always launched from the `back/` directory (both `start:dev` and `start`),
 * so we anchor to the working directory rather than __dirname (which differs src vs dist).
 * Override with FONTS_DIR if needed.
 */
export const FONTS_DIR = process.env.FONTS_DIR ?? join(process.cwd(), 'assets', 'fonts');
export const FONT_REGULAR = join(FONTS_DIR, 'LiberationSans-Regular.ttf');
export const FONT_BOLD = join(FONTS_DIR, 'LiberationSans-Bold.ttf');

export const CANVAS_FONT_FAMILY = 'LibSans';

let registered = false;

/** Registers the bundled fonts with @napi-rs/canvas exactly once (idempotent). */
export function ensureCanvasFonts(): void {
  if (registered) return;
  GlobalFonts.registerFromPath(FONT_REGULAR, CANVAS_FONT_FAMILY);
  GlobalFonts.registerFromPath(FONT_BOLD, `${CANVAS_FONT_FAMILY} Bold`);
  registered = true;
}
