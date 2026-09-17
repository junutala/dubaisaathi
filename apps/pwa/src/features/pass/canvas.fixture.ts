import { vi } from 'vitest';

/**
 * Test-only: the canvas the QR picture is drawn on. jsdom gives a real `<canvas>` element and
 * no 2D context behind it, and no `Path2D` at all, so both are stubbed on the prototype —
 * every canvas the code under test makes is answered, and nothing else in the document moves.
 *
 * `blob` is what `toBlob` answers with: a PNG, or `null` for a phone that would not encode one.
 */
export function stubCanvas(blob: Blob | null): void {
  const context: Partial<CanvasRenderingContext2D> = {
    fillStyle: '',
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    fillRect: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
  };

  // The part of the context the picture uses, standing in for a browser API jsdom lacks: the
  // drawing is not what these tests are about, only what comes out of it.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback: BlobCallback) => {
    callback(blob);
  });

  vi.stubGlobal(
    'Path2D',
    class {
      /** Takes the path data the way the real one does, and keeps none of it. */
      readonly stub = true;
    },
  );
}
