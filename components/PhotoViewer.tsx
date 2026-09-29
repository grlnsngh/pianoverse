import { createZoomController } from "@/utils/zoom";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  GestureResponderEvent,
  Modal,
  PanResponder,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

interface PhotoViewerProps {
  // The URLs of the photos, the cover first
  photos: string[];
  // The photo to show first when the viewer opens
  startIndex: number;
  visible: boolean;
  onClose: () => void;
}

const touchesOf = (event: GestureResponderEvent) =>
  event.nativeEvent.touches.map((touch) => ({
    x: touch.pageX,
    y: touch.pageY,
  }));

const arrowButton =
  "absolute top-1/2 w-11 h-16 -mt-8 rounded-xl bg-black/50 items-center justify-center";

/**
 * A piano's photos on the whole screen: pinch to zoom, move a zoomed photo
 * with one finger, double tap to zoom in and out, and swipe (or use the
 * arrows) to go through the photos.
 */
const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photos,
  startIndex,
  visible,
  onClose,
}) => {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(startIndex);

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

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

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black">
        <Animated.View
          style={{
            width,
            height,
            transform: [{ translateX }, { translateY }, { scale }],
          }}
          {...responder.panHandlers}
        >
          <Image
            source={{ uri: photos[index] }}
            style={{ width, height }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Boxes that let touches through, except on the buttons */}
        <View
          pointerEvents="box-none"
          className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-4"
          style={{ paddingTop: 44 }}
        >
          {photos.length > 1 ? (
            <Text className="text-white font-pmedium text-base">
              {index + 1} / {photos.length}
            </Text>
          ) : (
            <View />
          )}
          <TouchableOpacity
            onPress={onClose}
            accessibilityLabel="Close photo viewer"
            className="w-10 h-10 rounded-full bg-black/60 items-center justify-center"
          >
            <Ionicons name="close" size={22} color="white" />
          </TouchableOpacity>
        </View>

        {index > 0 && (
          <TouchableOpacity
            onPress={() => goToRef.current(index - 1)}
            accessibilityLabel="Previous photo"
            className={`${arrowButton} left-2`}
          >
            <Ionicons name="chevron-back" size={26} color="white" />
          </TouchableOpacity>
        )}
        {index < photos.length - 1 && (
          <TouchableOpacity
            onPress={() => goToRef.current(index + 1)}
            accessibilityLabel="Next photo"
            className={`${arrowButton} right-2`}
          >
            <Ionicons name="chevron-forward" size={26} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};

export default PhotoViewer;
