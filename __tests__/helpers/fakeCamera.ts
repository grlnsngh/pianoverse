/**
 * Stands in for expo-camera, which is native: the scanner's camera view is a
 * plain view that keeps the props it was given (the torch, the kinds of code it
 * reads, what it does when one is read), and the phone's camera permission is
 * whatever a test says it is. A test reads `scan(data)` to hold a code in front
 * of the camera.
 */

type Permission = { granted: boolean; canAskAgain: boolean; status: string; expires: string };

const granted: Permission = { granted: true, canAskAgain: true, status: "granted", expires: "never" };
const notAsked: Permission = { granted: false, canAskAgain: true, status: "undetermined", expires: "never" };
const refusedForGood: Permission = { granted: false, canAskAgain: false, status: "denied", expires: "never" };

export const fakeCamera = {
  /** What the phone says about the camera right now; null while it isn't known yet */
  permission: granted as Permission | null,
  /** What asking does: grant it, or refuse it for good */
  grantOnRequest: true,
  /** How many times the app asked */
  requests: 0,
  /** The camera view on screen, with the props it was given */
  props: null as Record<string, any> | null,
  reset() {
    this.permission = granted;
    this.grantOnRequest = true;
    this.requests = 0;
    this.props = null;
  },
  /** Holds a code in front of the camera: it is read, if the camera is asking for codes */
  scan(data: string) {
    this.props?.onBarcodeScanned?.({ type: "qr", data });
  },
};

export const PERMISSIONS = { granted, notAsked, refusedForGood };

export const createFakeCameraModule = () => {
  const React = require("react");
  const { View } = require("react-native");

  const CameraView = (props: Record<string, any>) => {
    fakeCamera.props = props;
    return React.createElement(View, {
      testID: props.testID ?? "camera",
      enableTorch: props.enableTorch,
      barcodeScannerSettings: props.barcodeScannerSettings,
      onBarcodeScanned: props.onBarcodeScanned,
      facing: props.facing,
      style: props.style,
    });
  };

  const useCameraPermissions = () => {
    const [permission, setPermission] = React.useState(fakeCamera.permission);
    const request = async () => {
      fakeCamera.requests += 1;
      const next = fakeCamera.grantOnRequest ? granted : refusedForGood;
      fakeCamera.permission = next;
      setPermission(next);
      return next;
    };
    return [permission, request, async () => permission];
  };

  return { __esModule: true, CameraView, useCameraPermissions };
};
