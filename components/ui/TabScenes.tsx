import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { motion } from "@/constants/theme";

type SceneProps = {
  active: boolean;
  /** Present when the tabs first appeared: show it at once instead of fading in */
  instant: boolean;
  testID?: string;
  children: React.ReactNode;
};

const FADE_MS = motion.duration.tabSwitch;
const easing = Easing.bezier(...motion.easing.standard);

const Scene = ({ active, instant, testID, children }: SceneProps) => {
  const opacity = useRef(new Animated.Value(active && instant ? 1 : 0)).current;

  useEffect(() => {
    if (active) {
      // Fades in from wherever it is now, so a tab that is still fading out
      // when it is chosen again doesn't blink
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_MS,
        easing,
        useNativeDriver: true,
      }).start();
      return () => opacity.stopAnimation();
    }
    // The tab being left stays put underneath while the new one fades in over
    // it, then goes. Fading both at once would dip through the background.
    const timer = setTimeout(() => opacity.setValue(0), FADE_MS);
    return () => clearTimeout(timer);
  }, [active, opacity]);

  return (
    <Animated.View
      testID={testID}
      pointerEvents={active ? "auto" : "none"}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
      style={[StyleSheet.absoluteFill, { zIndex: active ? 1 : 0, opacity }]}
    >
      {children}
    </Animated.View>
  );
};

export type TabScenesProps<T extends string> = {
  /** One screen per tab */
  scenes: Record<T, React.ComponentType>;
  active: T;
};

/**
 * The screens of the tabs. A screen is created the first time its tab is
 * shown and then kept, so it keeps its scroll position and what was typed in
 * it. Changing tab is a 120 ms fade, never a slide.
 */
function TabScenes<T extends string>({ scenes, active }: TabScenesProps<T>) {
  const initial = useRef(active).current;
  const visited = useRef(new Set<T>()).current;
  visited.add(active);

  return (
    <View style={styles.fill}>
      {(Object.keys(scenes) as T[])
        .filter((key) => visited.has(key))
        .map((key) => {
          const SceneScreen = scenes[key] as React.ComponentType;
          return (
            <Scene
              key={key}
              testID={`scene-${key}`}
              active={key === active}
              instant={key === initial}
            >
              <SceneScreen />
            </Scene>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export default TabScenes;
