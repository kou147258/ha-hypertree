export interface ZoomTransform {
  x: number;
  y: number;
  k: number;
}

// A typical mouse wheel notch is ~100px, which gives a ~35% step.
const ZOOM_PER_PIXEL = 0.003;
const MAX_WHEEL_PIXELS = 150;
const WHEEL_DELTA_LINE = 1;
const WHEEL_DELTA_PAGE = 2;
const LINE_HEIGHT_PX = 16;
const PAGE_HEIGHT_PX = 800;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 20;

export function createTransform(): ZoomTransform {
  return { x: 0, y: 0, k: 1 };
}

export function applyWheel(t: ZoomTransform, e: WheelEvent, rect: DOMRect): void {
  zoomAt(t, wheelZoomFactor(e.deltaY, e.deltaMode), e.clientX - rect.left, e.clientY - rect.top);
}

// Trackpads fire many small-delta events per gesture, so a fixed step per
// event zooms far too fast; scale by the scrolled distance instead.
export function wheelZoomFactor(deltaY: number, deltaMode: number): number {
  const pixels = deltaMode === WHEEL_DELTA_LINE ? deltaY * LINE_HEIGHT_PX
    : deltaMode === WHEEL_DELTA_PAGE ? deltaY * PAGE_HEIGHT_PX
      : deltaY;
  const clamped = Math.max(-MAX_WHEEL_PIXELS, Math.min(MAX_WHEEL_PIXELS, pixels));
  return Math.exp(-clamped * ZOOM_PER_PIXEL);
}

export function zoomAt(t: ZoomTransform, factor: number, sx: number, sy: number): void {
  const oldK = t.k;
  const newK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldK * factor));
  t.x = sx - (sx - t.x) * (newK / oldK);
  t.y = sy - (sy - t.y) * (newK / oldK);
  t.k = newK;
}

export function screenToWorld(t: ZoomTransform, sx: number, sy: number): { x: number; y: number } {
  return {
    x: (sx - t.x) / t.k,
    y: (sy - t.y) / t.k,
  };
}
