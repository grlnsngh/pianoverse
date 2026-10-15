import { Href, router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui";
import { spacing, type } from "@/constants/theme";
import { makeStyles, useColors } from "@/lib/ThemeContext";

/**
 * The top of a pushed screen: Back on the left and the title in the middle.
 * Back goes back, or to `fallback` when the screen was opened on its own.
 */
const BackBar = ({ title, fallback }: { title: string; fallback: Href }) => {
  const colors = useColors();
  const styles = useStyles();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  };
  return (
    <View style={styles.bar}>
      <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.side}>
        <Icon name="chevronLeft" size={24} color={colors.ink} strokeWidth={2.2} />
      </Pressable>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.side} />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  bar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  side: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { ...type.sheetTitle, flex: 1, textAlign: "center", color: colors.ink },
}));

export default BackBar;
