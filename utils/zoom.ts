/**
 * The maths and gestures behind the full-screen photo viewer: pinching to
 * zoom, moving a zoomed photo, double tapping to zoom in and out, and
 * swiping to the next or previous photo. It knows nothing about React or
 * touch events, so the viewer only has to pass on what the fingers do.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** How the photo is shown: zoomed by `scale`, moved by `tx` and `ty` from the middle. */
export interface ViewState {
  scale: number;
  tx: number;
  ty: number;
}

export interface PinchStart extends ViewState {
  // How far apart the two fingers were when the pinch began
  distance: number;
}

export const IDENTITY: ViewState = { scale: 1, tx: 0, ty: 0 };

export const MAX_SCALE = 4;
export const DOUBLE_TAP_SCALE = 2.5;
// A pinch that ends below this zoom snaps back to showing the whole photo
const SETTLE_SCALE = 1.05;
// A swipe has to go this far, and mostly sideways, to change the photo
const SWIPE_DISTANCE = 60;
// A tap moves less than this many points and lasts less than this long
const TAP_MOVEMENT = 10;
const TAP_MS = 300;
const DOUBLE_TAP_MS = 300;

// (Adding 0 turns a -0 into 0)
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value)) + 0;

/** How far a photo zoomed by `scale` can move so that it still covers `length`. */
const maxOffset = (scale: number, length: number) =>
  (length * (scale - 1)) / 2;

/** The view with its zoom and position kept within what makes sense. */
export const clampView = (view: ViewState, size: Size): ViewState => {
  const scale = clamp(view.scale, 1, MAX_SCALE);
  const maxX = maxOffset(scale, size.width);
  const maxY = maxOffset(scale, size.height);
  return {
    scale,
    tx: clamp(view.tx, -maxX, maxX),
    ty: clamp(view.ty, -maxY, maxY),
  };
};

export const pinchDistance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** The view while two fingers are `distance` apart, having started at `start`. */
export const pinched = (
  start: PinchStart,
  distance: number,
  size: Size
): ViewState =>
  clampView(
    {
      scale: start.scale * (distance / start.distance),
      tx: start.tx,
      ty: start.ty,
    },
    size
  );

/** The view after one finger moved a zoomed photo by `dx` and `dy` from `start`. */
export const panned = (
  start: ViewState,
  dx: number,
  dy: number,
  size: Size
): ViewState =>
  clampView(
    { scale: start.scale, tx: start.tx + dx, ty: start.ty + dy },
    size
  );

/** The view once the fingers of a pinch lift: barely zoomed snaps back. */
export const settled = (view: ViewState): ViewState =>
  view.scale < SETTLE_SCALE ? IDENTITY : view;

/** A double tap zooms a photo in, or back out if it is already zoomed. */
export const toggledZoom = (view: ViewState): ViewState =>
  view.scale > 1 ? IDENTITY : { scale: DOUBLE_TAP_SCALE, tx: 0, ty: 0 };

export const isTap = (dx: number, dy: number, ms: number) =>
  Math.abs(dx) < TAP_MOVEMENT && Math.abs(dy) < TAP_MOVEMENT && ms < TAP_MS;

/** 1 for the next photo, -1 for the previous one, 0 if it wasn't a swipe. */
export const swipeDirection = (
  dx: number,
  dy: number,
  scale: number
): 1 | -1 | 0 => {
  // A zoomed photo is moved, not swiped away
  if (scale > SETTLE_SCALE) return 0;
  if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) {
    return 0;
  }
  return dx < 0 ? 1 : -1;
};

export interface ZoomControllerOptions {
  getSize: () => Size;
  // Called with the new view whenever it changes
  onChange: (view: ViewState) => void;
  // Called when the user swipes to another photo
  onSwipe: (direction: 1 | -1) => void;
  // The time in milliseconds; only tests pass their own
  now?: () => number;
}

/**
 * Turns what the fingers do (a touch starting, moving and ending) into
 * changes of the view and swipes to other photos.
 */
export const createZoomController = ({
  getSize,
  onChange,
  onSwipe,
  now = Date.now,
}: ZoomControllerOptions) => {
  let view = IDENTITY;
  let pinchStart: PinchStart | null = null;
  let panStart: (ViewState & { dx: number; dy: number }) | null = null;
  let pinching = false;
  let startedAt = 0;
  let lastTap: number | null = null;

  const show = (next: ViewState) => {
    view = next;
    onChange(next);
  };

  return {
    /** Shows the whole photo again, e.g. because another photo is shown. */
    reset() {
      pinchStart = null;
      panStart = null;
      pinching = false;
      lastTap = null;
      show(IDENTITY);
    },

    /** A touch started. */
    grant() {
      pinchStart = null;
      panStart = { ...view, dx: 0, dy: 0 };
      pinching = false;
      startedAt = now();
    },

    /**
     * The fingers moved. `dx` and `dy` are how far the touch has moved since
     * it started.
     */
    move(touches: Point[], dx: number, dy: number) {
      if (touches.length >= 2) {
        const distance = pinchDistance(touches[0], touches[1]);
        if (!pinchStart) pinchStart = { ...view, distance };
        pinching = true;
        panStart = null;
        show(pinched(pinchStart, distance, getSize()));
        return;
      }

      pinchStart = null;
      if (view.scale > 1) {
        // After a pinch, carry on from where the photo is now
        if (!panStart) panStart = { ...view, dx, dy };
        show(
          panned(panStart, dx - panStart.dx, dy - panStart.dy, getSize())
        );
      }
    },

    /**
     * The touch ended (or was cancelled, when `completed` is false, which
     * settles a pinch but never counts as a tap or a swipe).
     */
    release(dx: number, dy: number, completed = true) {
      if (pinching) {
        pinching = false;
        pinchStart = null;
        show(settled(view));
        return;
      }
      if (!completed) return;

      const time = now();
      if (isTap(dx, dy, time - startedAt)) {
        if (lastTap !== null && time - lastTap < DOUBLE_TAP_MS) {
          lastTap = null;
          show(toggledZoom(view));
        } else {
          lastTap = time;
        }
        return;
      }

      const direction = swipeDirection(dx, dy, view.scale);
      if (direction !== 0) onSwipe(direction);
    },
  };
};
