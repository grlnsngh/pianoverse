import { router } from "expo-router";
import { format } from "date-fns";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddButton } from "@/components/ui";
import { colors, spacing, type } from "@/constants/theme";

/**
 * The Today tab: what needs attention. This is a placeholder with the real
 * header (date, title and the orange + button); the money, the rentals that
 * need attention and recent payments arrive in Batch 6 of
 * docs/redesign/PLAN.md.
 */
const Today = () => (
  <SafeAreaView edges={["top"]} style={styles.page}>
    <View style={styles.header}>
      <View>
        <Text style={styles.date}>{format(new Date(), "EEEE, d MMMM")}</Text>
        <Text style={styles.title}>Today</Text>
      </View>
      <AddButton onPress={() => router.push("/create")} />
    </View>

    <View style={styles.body}>
      <Text style={styles.soon}>
        Money received, rentals that need you and recent payments will show
        here soon. Your pianos are on the Pianos tab.
      </Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
  date: { ...type.secondary, fontFamily: type.bodyMedium.fontFamily, color: colors.ink2 },
  title: { ...type.largeTitle, color: colors.ink },
  body: { paddingTop: spacing.xxxl, paddingHorizontal: spacing.screen },
  soon: { ...type.body, color: colors.ink2 },
});

export default Today;
