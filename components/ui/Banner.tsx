import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, fonts, radii, type } from "@/constants/theme";
import Icon from "./Icon";
import Spinner from "./Spinner";

/**
 * `offline` says the list is a saved copy. `syncing` shows work in progress.
 * `error` says something didn't go through, with a way to retry.
 */
export type BannerVariant = "offline" | "syncing" | "error";

const ICON_SIZE = 18;

export type BannerProps = {
  variant: BannerVariant;
  message: string;
  /** Bold first words, such as "Offline." */
  lead?: string;
  /** Shows the retry link on an error banner */
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** A slim strip at the top of a list. Sits in the flow, not over the content. */
const Banner = ({
  variant,
  message,
  lead,
  onRetry,
  retryLabel = "Retry",
  style,
  testID,
}: BannerProps) => {
  const isError = variant === "error";
  const textColor = isError ? colors.lateTintText : colors.inkBody;

  return (
    <View
      // Not one accessible block: the message and the retry link are read separately
      accessibilityRole={isError ? "alert" : undefined}
      accessibilityLiveRegion={isError ? "assertive" : "polite"}
      testID={testID}
      style={[
        styles.strip,
        { backgroundColor: isError ? colors.lateTint : colors.grouped },
        style,
      ]}
    >
      {variant === "offline" && (
        <Icon name="wifiOff" size={ICON_SIZE} color={colors.ink2} strokeWidth={1.9} />
      )}
      {variant === "syncing" && (
        <Spinner size={ICON_SIZE} decorative />
      )}
      {isError && <Icon name="alert" size={ICON_SIZE} color={colors.late} strokeWidth={2} />}

      <Text style={[styles.text, { color: textColor }]}>
        {lead ? <Text style={styles.lead}>{lead} </Text> : null}
        {message}
      </Text>

      {isError && onRetry && (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          // The strip is 38 high; the tap area is not
          hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
        >
          <Text style={[styles.retry, { color: colors.lateTintText }]}>
            {retryLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.input,
  },
  text: { ...type.caption, flexGrow: 1, flexShrink: 1 },
  lead: { fontFamily: fonts.bold },
  retry: { ...type.caption, fontFamily: fonts.bold },
});

export default React.memo(Banner);
