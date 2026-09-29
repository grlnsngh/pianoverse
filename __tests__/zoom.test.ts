import {
  clampView,
  createZoomController,
  IDENTITY,
  isTap,
  MAX_SCALE,
  panned,
  pinchDistance,
  pinched,
  settled,
  swipeDirection,
  toggledZoom,
  ViewState,
} from "@/utils/zoom";

const size = { width: 400, height: 800 };

describe("keeping the photo on the screen", () => {
  it("never zooms out further than the screen or in further than the maximum", () => {
    expect(clampView({ scale: 0.5, tx: 0, ty: 0 }, size).scale).toBe(1);
    expect(clampView({ scale: 10, tx: 0, ty: 0 }, size).scale).toBe(MAX_SCALE);
    expect(clampView({ scale: 2, tx: 0, ty: 0 }, size).scale).toBe(2);
  });

  it("lets a zoomed photo move only as far as its edges", () => {
    // At 2x the photo is twice as wide and tall, so half a screen of it
    // sticks out on each side
    expect(clampView({ scale: 2, tx: 500, ty: 900 }, size)).toEqual({
      scale: 2,
      tx: 200,
      ty: 400,
    });
    expect(clampView({ scale: 2, tx: -500, ty: -900 }, size)).toEqual({
      scale: 2,
      tx: -200,
      ty: -400,
    });
  });

  it("keeps a photo that isn't zoomed in the middle", () => {
    expect(clampView({ scale: 1, tx: 50, ty: -50 }, size)).toEqual(IDENTITY);
  });
});

describe("pinching", () => {
  const start = { scale: 1, tx: 0, ty: 0, distance: 100 };

  it("measures the distance between two fingers", () => {
    expect(pinchDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("zooms by how much the fingers moved apart", () => {
    expect(pinched(start, 200, size).scale).toBe(2);
    expect(pinched({ ...start, scale: 2 }, 150, size).scale).toBe(3);
  });

  it("zooms back out when the fingers come together, but not below the screen", () => {
    expect(pinched({ ...start, scale: 2 }, 50, size).scale).toBe(1);
    expect(pinched(start, 10, size).scale).toBe(1);
  });

  it("stops at the maximum", () => {
    expect(pinched(start, 1000, size).scale).toBe(MAX_SCALE);
  });
});

describe("moving a zoomed photo", () => {
  it("follows the finger", () => {
    const zoomed: ViewState = { scale: 3, tx: 10, ty: -20 };

    expect(panned(zoomed, 30, 40, size)).toEqual({ scale: 3, tx: 40, ty: 20 });
  });

  it("stops at the edges", () => {
    expect(panned({ scale: 2, tx: 0, ty: 0 }, 1000, -1000, size)).toEqual({
      scale: 2,
      tx: 200,
      ty: -400,
    });
  });
});

describe("letting go of a pinch", () => {
  it("snaps back when the photo is barely zoomed", () => {
    expect(settled({ scale: 1.02, tx: 5, ty: 5 })).toEqual(IDENTITY);
  });

  it("keeps a photo that is clearly zoomed", () => {
    const view = { scale: 1.5, tx: 5, ty: 5 };

    expect(settled(view)).toEqual(view);
  });
});

describe("double tapping", () => {
  it("zooms in on a photo that isn't zoomed", () => {
    expect(toggledZoom(IDENTITY).scale).toBeGreaterThan(1);
    expect(toggledZoom(IDENTITY).tx).toBe(0);
  });

  it("zooms back out of a zoomed photo", () => {
    expect(toggledZoom({ scale: 3, tx: 40, ty: 20 })).toEqual(IDENTITY);
  });
});

describe("telling a tap from a swipe", () => {
  it("is a tap when the finger barely moved and lifted quickly", () => {
    expect(isTap(2, -3, 120)).toBe(true);
  });

  it("is not a tap when the finger moved or stayed down", () => {
    expect(isTap(30, 0, 100)).toBe(false);
    expect(isTap(0, 30, 100)).toBe(false);
    expect(isTap(2, 2, 600)).toBe(false);
  });

  it("goes to the next photo on a swipe to the left and the previous on a swipe to the right", () => {
    expect(swipeDirection(-120, 10, 1)).toBe(1);
    expect(swipeDirection(120, -10, 1)).toBe(-1);
  });

  it("ignores short and mostly vertical swipes", () => {
    expect(swipeDirection(-30, 0, 1)).toBe(0);
    expect(swipeDirection(-100, 90, 1)).toBe(0);
  });

  it("doesn't change photo while the photo is zoomed, when a swipe moves it", () => {
    expect(swipeDirection(-200, 0, 2)).toBe(0);
  });
});

describe("the gestures together", () => {
  const touch = (x: number, y = 0) => ({ x, y });

  const setup = () => {
    let time = 1000;
    const views: ViewState[] = [];
    const swipes: number[] = [];
    const controller = createZoomController({
      getSize: () => size,
      onChange: (view) => views.push(view),
      onSwipe: (direction) => swipes.push(direction),
      now: () => time,
    });
    return {
      controller,
      views,
      swipes,
      wait: (ms: number) => {
        time += ms;
      },
      last: () => views[views.length - 1],
    };
  };

  it("zooms with two fingers and keeps the zoom when they lift", () => {
    const { controller, last } = setup();

    controller.grant();
    controller.move([touch(100), touch(200)], 0, 0);
    controller.move([touch(50), touch(250)], 0, 0);
    expect(last().scale).toBe(2);
    controller.release(0, 0);

    expect(last().scale).toBe(2);
  });

  it("snaps back to the screen when the fingers end almost where they began", () => {
    const { controller, last } = setup();

    controller.grant();
    controller.move([touch(100), touch(200)], 0, 0);
    controller.move([touch(98), touch(202)], 0, 0);
    controller.release(0, 0);

    expect(last()).toEqual(IDENTITY);
  });

  it("zooms in on a double tap and out on the next one", () => {
    const { controller, last, wait } = setup();
    const tap = () => {
      controller.grant();
      wait(60);
      controller.release(1, 1);
    };

    tap();
    wait(100);
    tap();
    expect(last().scale).toBeGreaterThan(1);

    wait(100);
    tap();
    wait(100);
    tap();
    expect(last()).toEqual(IDENTITY);
  });

  it("does nothing on a single tap, or on two taps far apart in time", () => {
    const { controller, views, wait } = setup();
    const tap = () => {
      controller.grant();
      wait(60);
      controller.release(0, 0);
    };

    tap();
    wait(1000);
    tap();

    expect(views).toEqual([]);
  });

  it("moves a zoomed photo with one finger", () => {
    const { controller, last } = setup();
    controller.grant();
    controller.move([touch(100), touch(200)], 0, 0);
    controller.move([touch(50), touch(250)], 0, 0);
    controller.release(0, 0);

    controller.grant();
    controller.move([touch(150)], 40, 60);

    expect(last()).toEqual({ scale: 2, tx: 40, ty: 60 });
  });

  it("carries on moving from where it was when one of two fingers lifts", () => {
    const { controller, last } = setup();
    controller.grant();
    controller.move([touch(100), touch(200)], 0, 0);
    controller.move([touch(50), touch(250)], 0, 0);
    // One finger lifts: the gesture's offsets jump to this finger's
    controller.move([touch(250)], 90, 0);
    expect(last()).toEqual({ scale: 2, tx: 0, ty: 0 });
    controller.move([touch(270)], 110, 0);

    expect(last()).toEqual({ scale: 2, tx: 20, ty: 0 });
  });

  it("changes photo on a swipe when the photo isn't zoomed", () => {
    const { controller, swipes, wait } = setup();

    controller.grant();
    controller.move([touch(300)], -150, 5);
    wait(200);
    controller.release(-150, 5);

    expect(swipes).toEqual([1]);
  });

  it("doesn't change photo when a swipe follows a zoom", () => {
    const { controller, swipes } = setup();

    controller.grant();
    controller.move([touch(100), touch(200)], 0, 0);
    controller.move([touch(50), touch(250)], -150, 0);
    controller.release(-150, 0);

    expect(swipes).toEqual([]);
  });

  it("doesn't change photo when the gesture was cancelled", () => {
    const { controller, swipes, wait } = setup();

    controller.grant();
    wait(200);
    controller.release(-150, 0, false);

    expect(swipes).toEqual([]);
  });

  it("shows the whole photo again when reset", () => {
    const { controller, last } = setup();
    controller.grant();
    controller.move([touch(100), touch(200)], 0, 0);
    controller.move([touch(50), touch(250)], 0, 0);
    controller.release(0, 0);

    controller.reset();

    expect(last()).toEqual(IDENTITY);
  });
});
