import { images } from "@/constants";
import { SECONDARY_COLOR } from "@/constants/colors";
import { Image } from "expo-image";
import React from "react";
import { Text, View, StyleSheet } from "react-native";

const Logo = () => {
  return (
    <View style={styles.container}>
      <Image
        source={images.piano}
        style={styles.icon}
        contentFit="contain"
        tintColor={SECONDARY_COLOR}
      />
      <Text style={styles.title}>
        Piano
        <Text style={styles.subtitle}>verse</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    width: 44,
    height: 44,
  },
  title: {
    fontSize: 42,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    color: SECONDARY_COLOR,
    fontWeight: '800',
  },
});

export default Logo;
