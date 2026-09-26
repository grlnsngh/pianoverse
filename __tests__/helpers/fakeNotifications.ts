/**
 * In-memory stand-in for `expo-notifications`: keeps scheduled notifications
 * and listener subscriptions so tests can inspect them and simulate taps.
 */
type Scheduled = { identifier: string; content: any; trigger: any };
type Listener = (event: any) => void;

export const fakeNotifications = {
  scheduled: [] as Scheduled[],
  receivedListeners: new Set<Listener>(),
  responseListeners: new Set<Listener>(),
  lastResponse: null as any,
  nextId: 1,
  reset() {
    this.scheduled = [];
    this.receivedListeners.clear();
    this.responseListeners.clear();
    this.lastResponse = null;
    this.nextId = 1;
  },
  /** The user taps a notification while the app is running. */
  tap(response: any) {
    this.responseListeners.forEach((listener) => listener(response));
  },
  rentalReminders(pianoId?: string) {
    return this.scheduled.filter(
      (notification) =>
        notification.content.data?.type === "rental_due" &&
        (!pianoId || notification.content.data.pianoId === pianoId)
    );
  },
};

export const reminderTapFor = (pianoId: string, identifier = "reminder-1") => ({
  actionIdentifier: "expo.modules.notifications.actions.DEFAULT",
  notification: {
    request: {
      identifier,
      content: {
        title: "🎹 Piano Rental Due Soon!",
        data: { type: "rental_due", pianoId },
      },
    },
  },
});

const subscribe = (listeners: Set<Listener>) => (listener: Listener) => {
  listeners.add(listener);
  return { remove: () => listeners.delete(listener) };
};

export const createFakeNotificationsModule = () => ({
  __esModule: true,
  AndroidImportance: { HIGH: 4 },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  requestPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async ({ content, trigger }: any) => {
    const identifier = `notification-${fakeNotifications.nextId++}`;
    fakeNotifications.scheduled.push({ identifier, content, trigger });
    return identifier;
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () =>
    fakeNotifications.scheduled.map((notification) => ({ ...notification }))
  ),
  cancelScheduledNotificationAsync: jest.fn(async (identifier: string) => {
    fakeNotifications.scheduled = fakeNotifications.scheduled.filter(
      (notification) => notification.identifier !== identifier
    );
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    fakeNotifications.scheduled = [];
  }),
  addNotificationReceivedListener: jest.fn(
    subscribe(fakeNotifications.receivedListeners)
  ),
  addNotificationResponseReceivedListener: jest.fn(
    subscribe(fakeNotifications.responseListeners)
  ),
  removeNotificationSubscription: jest.fn((subscription: any) =>
    subscription.remove()
  ),
  getLastNotificationResponseAsync: jest.fn(
    async () => fakeNotifications.lastResponse
  ),
});
