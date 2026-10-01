import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useStore } from "react-redux";
import ReminderPreview, { SAMPLE_REMINDER } from "@/components/ReminderPreview";
import { Button, Icon, Sheet } from "@/components/ui";
import { fonts, spacing } from "@/constants/theme";
import { markNotifyPrimerSeen, shouldShowNotifyPrimer } from "@/lib/notifyPrimer";
import { RootState } from "@/redux/store";
import {
  requestNotificationPermissions,
  scheduleAllRentalNotifications,
} from "@/services/notifications";
import { makeStyles, useColors } from "@/lib/ThemeContext";

/** Let the screen behind settle before the sheet rises over it */
const SHOW_AFTER_MS = 600;

/**
 * "Get reminders before rentals end" (NotifyPrimer board): shown once, over
 * the first screen after signing in, before the phone's own question about
 * notifications, so the person knows why it is coming. Turn on reminders
 * asks the phone, and then sets the reminders of the pianos already there;
 * Not now leaves it.
 */
const NotifyPrimerSheet = () => {
  const colors = useColors();
  const styles = useStyles();
  const store = useStore<RootState>();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    shouldShowNotifyPrimer().then((show) => {
      if (show && current) timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    });
    return () => {
      current = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const close = () => {
    setVisible(false);
    markNotifyPrimerSeen();
  };

  const turnOn = async () => {
    close();
    const allowed = await requestNotificationPermissions();
    if (allowed) await scheduleAllRentalNotifications(store.getState().pianos.items);
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      tone="white"
      testID="notify-primer"
      footer={
        <View style={styles.buttons}>
          <Button title="Turn on reminders" onPress={turnOn} />
          <Button title="Not now" variant="text" size="compact" onPress={close} />
        </View>
      }
    >
      <View style={styles.body}>
        <View style={styles.circle}>
          <Icon name="bell" size={30} color={colors.onBrand} strokeWidth={1.9} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Get reminders before rentals end
        </Text>
        <Text style={styles.message}>
          We notify you at 9:00 AM, so you never miss a return or a payment.
        </Text>
        <View style={styles.preview}>
          <ReminderPreview {...SAMPLE_REMINDER} />
        </View>
      </View>
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  body: { alignItems: "center", paddingTop: spacing.xl, paddingHorizontal: spacing.xs },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },
  title: {
    marginTop: spacing.xl,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.36,
    color: colors.ink,
    textAlign: "center",
  },
  message: {
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink2,
    textAlign: "center",
  },
  preview: { alignSelf: "stretch", marginTop: spacing.xl },
  buttons: { gap: 6 },
}));

export default NotifyPrimerSheet;
