import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useSelector } from "react-redux";
import CameraDeniedSheet from "@/components/CameraDeniedSheet";
import { Button, Icon, Spinner } from "@/components/ui";
import { fonts, maxScale, radii, spacing, type } from "@/constants/theme";
import { usePianoData } from "@/lib/PianoDataContext";
import { makeStyles, useColors, useTheme } from "@/lib/ThemeContext";
import { RootState } from "@/redux/store";
import { pianoIdFromLabel } from "@/utils/qrScan";

/** What a scanned code turned out to be, when it didn't open a piano. */
type Problem = "other" | "gone" | "loading";

const PROBLEMS: Record<Problem, { title: string; message: string }> = {
  other: {
    title: "That isn’t a Pianoverse label",
    message: "It may be another kind of code. Point the camera at the label on a piano.",
  },
  gone: {
    title: "This piano isn’t in your account",
    message: "It may have been deleted, or the label is from another account.",
  },
  loading: {
    title: "Your pianos are still loading",
    message: "Try again in a moment.",
  },
};

/** The frame in the middle of the camera: four rounded corners, 244 across, drawn as one path. */
const FRAME = 244;
const CORNERS =
  "M2 54V22A20 20 0 0 1 22 2h32M190 2h32a20 20 0 0 1 20 20v32M242 190v32a20 20 0 0 1-20 20h-32M54 242H22A20 20 0 0 1 2 222v-32";

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/home");
};

/**
 * Scan a label (QrScan boards), opened from the Pianos tab: the camera on a
 * dark screen with a frame to hold the label in, a Light button for the torch
 * and a hint. A label made by the app opens that piano's page; any other code,
 * or a piano that isn't in the account, says so with Scan again. Without
 * camera access it shows the Camera access is off sheet (Open Settings, Not now).
 */
const ScanScreen = () => {
  const colors = useColors();
  const styles = useStyles();
  const { scheme } = useTheme();
  const pianos = useSelector((state: RootState) => state.pianos.items);
  const { status } = usePianoData();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [denied, setDenied] = useState(false);
  // A code is read many times a second: only the first one counts until Scan again
  const handled = useRef(false);
  const asked = useRef(false);

  // The camera is under a dark screen, so the status bar's icons are light while it is here
  useEffect(() => {
    StatusBar.setBarStyle("light-content", true);
    return () => StatusBar.setBarStyle(scheme === "dark" ? "light-content" : "dark-content", true);
  }, [scheme]);

  // Ask for the camera once, when it hasn't been asked or refused for good
  useEffect(() => {
    if (!permission || permission.granted || asked.current) return;
    asked.current = true;
    if (!permission.canAskAgain) {
      setDenied(true);
      return;
    }
    requestPermission()
      .then((answer) => {
        if (!answer.granted) setDenied(true);
      })
      .catch(() => setDenied(true));
  }, [permission, requestPermission]);

  const onScanned = useCallback(
    ({ data }: { data: string }) => {
      if (handled.current) return;
      handled.current = true;
      const pianoId = pianoIdFromLabel(data);
      if (!pianoId) {
        setProblem("other");
        return;
      }
      if (pianos.some((piano) => piano.$id === pianoId)) {
        // The scanner is replaced by the piano, so Back goes to where the scan began
        router.replace(`/detail/${pianoId}`);
        return;
      }
      setProblem(status === "loading" ? "loading" : "gone");
    },
    [pianos, status]
  );

  const scanAgain = useCallback(() => {
    handled.current = false;
    setProblem(null);
  }, []);

  const granted = !!permission?.granted;
  const message = problem ? PROBLEMS[problem] : null;

  return (
    <View style={styles.page}>
      {granted && (
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={problem ? undefined : onScanned}
          testID="camera"
        />
      )}
      {permission === null && (
        <View style={styles.waiting}>
          <Spinner size={32} accessibilityLabel="Starting the camera" />
        </View>
      )}

      <SafeAreaView edges={["top", "bottom"]} style={styles.overlay} pointerEvents="box-none">
        <View style={styles.bar}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.round}
          >
            <Icon name="close" size={22} color={colors.white} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxScale.section}>
            Scan a label
          </Text>
          {granted ? (
            <Pressable
              onPress={() => setTorch((on) => !on)}
              accessibilityRole="switch"
              accessibilityLabel="Light"
              accessibilityState={{ checked: torch }}
              style={[styles.light, torch && styles.lightOn]}
            >
              <Icon name="bulb" size={18} color={torch ? colors.ink : colors.white} strokeWidth={1.9} />
              <Text style={[styles.lightText, torch && styles.lightTextOn]}>Light</Text>
            </Pressable>
          ) : (
            <View style={styles.round} />
          )}
        </View>

        {granted && (
          <View style={styles.middle} pointerEvents="none">
            <Svg width={FRAME} height={FRAME} viewBox={`0 0 ${FRAME} ${FRAME}`} fill="none" accessibilityElementsHidden>
              <Path d={CORNERS} stroke={colors.white} strokeWidth={4} strokeLinecap="round" />
            </Svg>
          </View>
        )}

        {granted && !message && (
          <View style={styles.hintRow} pointerEvents="none">
            <Text style={styles.hint}>Point the camera at the label on the piano</Text>
          </View>
        )}

        {message && (
          <View style={styles.card} accessibilityLiveRegion="polite">
            <Text style={styles.cardTitle} accessibilityRole="header">
              {message.title}
            </Text>
            <Text style={styles.cardText}>{message.message}</Text>
            <Button title="Scan again" onPress={scanAgain} style={styles.cardButton} />
          </View>
        )}
      </SafeAreaView>

      <CameraDeniedSheet
        visible={denied}
        onClose={goBack}
        onChooseFromGallery={goBack}
        secondaryLabel="Not now"
        message="Allow camera access in Settings to scan the labels on your pianos."
      />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.viewer },
  camera: StyleSheet.absoluteFill,
  waiting: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.viewerButton,
  },
  // The title sits between the two buttons, never over them (it may take two lines)
  title: { flex: 1, minWidth: 0, textAlign: "center", fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.white },
  light: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: colors.viewerButton,
  },
  lightOn: { backgroundColor: colors.white },
  lightText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.white },
  lightTextOn: { color: colors.ink },
  middle: { flex: 1, alignItems: "center", justifyContent: "center" },
  hintRow: { alignItems: "center", paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  hint: {
    ...type.status,
    overflow: "hidden",
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    color: colors.white,
    backgroundColor: colors.viewerButton,
  },
  card: {
    marginHorizontal: spacing.screen,
    marginBottom: spacing.xl,
    padding: spacing.xl,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, textAlign: "center", color: colors.ink },
  cardText: { ...type.secondary, marginTop: 4, textAlign: "center", color: colors.ink2 },
  cardButton: { marginTop: spacing.lg },
}));


export default ScanScreen;
