import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui";
import { fonts, spacing, type } from "@/constants/theme";
import { makeStyles, useColors } from "@/lib/ThemeContext";

type AuthScreenProps = {
  title: string;
  subtitle: string;
  /** What the back button does. It is greyed and can't be pressed while `busy`. */
  onBack: () => void;
  /** Read out for the back button: "Back", or "Back to sign in" */
  backLabel?: string;
  /** True while a request is going on: the back button is greyed out */
  busy?: boolean;
  /** The other way in, at the bottom: "New to Pianoverse? Create account" */
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * The page the four auth screens share (SignIn, SignUp and Forgot boards): a
 * white page with a back button, a large title and a line under it, the form,
 * and a line at the bottom that links to the other screen. The form scrolls
 * and moves up when the keyboard opens.
 */
const AuthScreen = ({
  title,
  subtitle,
  onBack,
  backLabel = "Back",
  busy = false,
  footer,
  children,
}: AuthScreenProps) => {
  const colors = useColors();
  const styles = useStyles();
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.page}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.top}>
            <Pressable
              onPress={onBack}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              accessibilityState={{ disabled: busy }}
              style={styles.back}
            >
              <Icon
                name="chevronLeft"
                size={24}
                color={busy ? colors.disabledText : colors.ink}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>

          <View style={styles.body}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
          </View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/** The red box above the fields when the whole attempt failed (SignInError board). */
export const AuthError = ({ message }: { message: string }) => {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="alert" size={20} color={colors.late} strokeWidth={2} style={styles.errorIcon} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
};

/** A line with "or" in the middle, between the form and the other way in. */
export const AuthDivider = () => {
  const styles = useStyles();
  return (
    <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or</Text>
      <View style={styles.dividerLine} />
    </View>
  );
};

/** "New to Pianoverse? Create account": grey words and a bold underlined link. */
export const AuthSwitch = ({
  question,
  action,
  onPress,
}: {
  question: string;
  action: string;
  onPress: () => void;
}) => {
  const styles = useStyles();
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switch}>{question}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={action}
        style={styles.switchPress}
      >
        <Text style={styles.switchLink}>{action}</Text>
      </Pressable>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1 },
  top: { paddingTop: spacing.md, paddingHorizontal: spacing.md },
  back: {
    width: spacing.minTarget,
    height: spacing.minTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingTop: spacing.xxl, paddingHorizontal: spacing.xxl },
  title: { ...type.largeTitle, color: colors.ink },
  subtitle: { marginTop: 6, ...type.body, color: colors.ink2 },
  footer: { marginTop: "auto", paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  error: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.lateTint,
  },
  errorIcon: { marginTop: 1 },
  errorText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.lateTintText,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.hairline },
  dividerText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink2 },
  switchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
  },
  switch: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink2 },
  // 44 high with the words, as on the board
  switchPress: { paddingVertical: spacing.md, paddingHorizontal: 2, marginLeft: 4 },
  switchLink: {
    fontFamily: fonts.bold,
    color: colors.ink,
    textDecorationLine: "underline",
  },
}));

export default AuthScreen;
