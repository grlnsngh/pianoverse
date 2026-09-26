import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setToastListener } from "@/utils/toast";

const VISIBLE_MS = { short: 2000, long: 3500 };

/** Shows messages from showToast() on platforms without ToastAndroid. */
const ToastHost = () => {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    setToastListener((text, duration) => {
      clearTimeout(hideTimer);
      setMessage(text);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
      hideTimer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setMessage(null));
      }, VISIBLE_MS[duration]);
    });

    return () => {
      setToastListener(null);
      clearTimeout(hideTimer);
    };
  }, [opacity]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { bottom: insets.bottom + 96, opacity }]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: "90%",
    backgroundColor: "#232533",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: {
    color: "#FFFFFF",
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    textAlign: "center",
  },
});

export default ToastHost;
