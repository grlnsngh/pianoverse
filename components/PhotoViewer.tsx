import { createZoomController } from "@/utils/zoom";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  GestureResponderEvent,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui";
import { colors, fonts } from "@/constants/theme";

interface PhotoViewerProps {
  // The URLs of the photos, the cover first
  photos: string[];
  // The photo to show first when the viewer opens
  startIndex: number;
  visible: boolean;
  onClose: () => void;
}

const THUMB = 56;

const touchesOf = (event: GestureResponderEvent) =>
  event.nativeEvent.touches.map((touch) => ({
    x: touch.pageX,
    y: touch.pageY,
  }));

/**
 * A piano's photos on the whole screen (PhotoViewer board): pinch to zoom,
 * move a zoomed photo with one finger, double tap to zoom in and out, swipe
 * to go through the photos, or tap one in the strip of small photos at the
 * bottom. A photo that can't load shows a Retry button.
 */
const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photos,
  startIndex,
  visible,
  onClose,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);
  // The photo that couldn't load, and how many times it has been asked for again
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(0)).current;

  // What the gesture handlers below need, which they created once but must
  // read fresh
  const latest = useRef({ width, height, index, count: photos.length });
  latest.current = { width, height, index, count: photos.length };

  const controller = useRef(
    createZoomController({
      getSize: () => ({
        width: latest.current.width,
        height: latest.current.height,
      }),
      onChange: (view) => {
        scale.setValue(view.scale);
        translateX.setValue(view.tx);
        translateY.setValue(view.ty);
      },
      onSwipe: (direction) => goTo(latest.current.index + direction),
    })
  ).current;

  const goTo = (next: number) => {
    if (next < 0 || next >= latest.current.count) return;
    setIndex(next);
    controller.reset();
  };
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  // Start from the photo that was tapped, whole and not zoomed
  useEffect(() => {
    if (!visible) return;
    setIndex(startIndex);
    controller.reset();
  }, [visible, startIndex, controller]);

  // "Pinch or double-tap to zoom" appears for a few seconds, then goes
  useEffect(() => {
    if (!visible) return;
    hint.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(hint, { toValue: 1, duration: 200, delay: 300, useNativeDriver: true }),
      Animated.timing(hint, { toValue: 0, duration: 300, delay: 3200, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [visible, hint]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => controller.grant(),
      onPanResponderMove: (event, gesture) =>
        controller.move(touchesOf(event), gesture.dx, gesture.dy),
      onPanResponderRelease: (_event, gesture) =>
        controller.release(gesture.dx, gesture.dy),
      onPanResponderTerminate: (_event, gesture) =>
        controller.release(gesture.dx, gesture.dy, false),
    })
  ).current;

  const current = photos[index];
  const failed = !!current && current === failedUri;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.screen}>
        <Animated.View
          style={{
            width,
            height,
            transform: [{ translateX }, { translateY }, { scale }],
          }}
          {...responder.panHandlers}
        >
          {!failed && (
            <Image
              key={attempt}
              source={{ uri: current }}
              style={{ width, height }}
              contentFit="contain"
              onError={() => setFailedUri(current)}
            />
          )}
        </Animated.View>

        {failed && (
          <View pointerEvents="box-none" style={styles.retryWrap}>
            <Pressable
              onPress={() => {
                setFailedUri(null);
                setAttempt((count) => count + 1);
              }}
              accessibilityRole="button"
              accessibilityLabel="Photo didn't load. Retry"
              style={styles.retry}
            >
              <Icon name="refresh" size={22} color={colors.white} strokeWidth={1.75} />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Boxes that let touches through, except on the buttons */}
        <View
          pointerEvents="box-none"
          style={[styles.top, { paddingTop: insets.top + 8 }]}
        >
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close photo viewer"
            style={styles.topButton}
          >
            <Icon name="close" size={24} color={colors.white} strokeWidth={2.2} />
          </Pressable>
          {photos.length > 1 ? (
            <Text style={styles.count} accessibilityLiveRegion="polite">
              {index + 1} of {photos.length}
            </Text>
          ) : null}
          {/* Where the board's ⋯ button is: nothing to offer here yet */}
          <View style={styles.topButton} />
        </View>

        <View
          pointerEvents="box-none"
          style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}
        >
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.hint, { opacity: hint }]}
          >
            <Text style={styles.hintText}>Pinch or double-tap to zoom</Text>
          </Animated.View>

          {photos.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.strip}
            >
              {photos.map((uri, position) => {
                const selected = position === index;
                return (
                  <Pressable
                    key={`${position}-${uri}`}
                    onPress={() => goToRef.current(position)}
                    accessibilityRole="button"
                    accessibilityLabel={`Photo ${position + 1}`}
                    accessibilityState={{ selected }}
                    style={[styles.thumb, selected ? styles.thumbSelected : styles.thumbDim]}
                  >
                    <Image
                      source={{ uri }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.viewer },
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 56 + 44,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  topButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  count: {
    height: 44,
    lineHeight: 44,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.white,
  },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" },
  hint: {
    width: 200,
    height: 32,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: colors.viewerHint,
  },
  hintText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  strip: { flexGrow: 1, justifyContent: "center", gap: 10, paddingHorizontal: 20 },
  thumb: { width: THUMB, height: THUMB, borderRadius: 10, overflow: "hidden" },
  thumbDim: { opacity: 0.6 },
  thumbSelected: { borderWidth: 2, borderColor: colors.brand },
  retryWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  retry: { alignItems: "center", gap: 6, padding: 24 },
  retryText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.white },
});

export default PhotoViewer;
