import React from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Icon, Spinner, Stepper } from "@/components/ui";
import type { IconName } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import type { PaperAction } from "@/lib/usePaperPdf";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import { MAX_COPIES } from "@/utils/paperForms/catalog";

/** A grey button with an icon, for Print and Share under Save PDF. */
const QuietButton = ({
  icon,
  title,
  busy,
  disabled,
  onPress,
}: {
  icon: IconName;
  title: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) => {
  const colors = useColors();
  const styles = useStyles();
  const blocked = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: blocked, busy }}
      style={({ pressed }) => [styles.quiet, pressed && !blocked && styles.quietPressed]}
    >
      {busy ? (
        <Spinner size={18} decorative />
      ) : (
        <Icon name={icon} size={18} strokeWidth={1.9} color={disabled ? colors.disabledText : colors.ink} />
      )}
      <Text style={[styles.quietLabel, disabled && !busy && { color: colors.disabledText }]}>{title}</Text>
    </Pressable>
  );
};

/** How many copies: what one copy is called and a hint, and the minus and plus. */
export const CopiesRow = ({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) => {
  const styles = useStyles();
  return (
    <View style={styles.countRow}>
      <View style={styles.countText}>
        <Text style={styles.countLabel}>{label}</Text>
        <Text style={styles.countHint}>{hint}</Text>
      </View>
      <Stepper value={value} onChange={onChange} min={1} max={MAX_COPIES} unit={label.toLowerCase()} />
    </View>
  );
};

type PaperActionsProps = {
  /** What is being done now, if anything: the other buttons wait */
  busy: PaperAction | null;
  onSave: () => void;
  onPrint: () => void;
  onShare: () => void;
};

/**
 * The bottom of a paper form's screen (PaperFormDetail and PaperAgreement
 * boards): Save PDF, then Print and Share, and the line that says the form is
 * made on the phone.
 */
const PaperActions = ({ busy, onSave, onPrint, onShare }: PaperActionsProps) => {
  const colors = useColors();
  const styles = useStyles();
  const working = busy !== null;
  return (
    <>
      <View style={styles.actions}>
        <Button
          title="Save PDF"
          loading={busy === "save"}
          loadingTitle="Making PDF"
          disabled={working && busy !== "save"}
          onPress={onSave}
        />
        <View style={styles.row}>
          <QuietButton
            icon="printer"
            title="Print"
            busy={busy === "print"}
            disabled={working && busy !== "print"}
            onPress={onPrint}
          />
          <QuietButton
            icon="share"
            title="Share"
            busy={busy === "share"}
            disabled={working && busy !== "share"}
            onPress={onShare}
          />
        </View>
      </View>

      <View style={styles.privacy}>
        <Icon name="lock" size={16} color={colors.ink2} strokeWidth={2} />
        <Text style={styles.privacyText}>Made on this phone. What you write stays with you.</Text>
      </View>
    </>
  );
};

const useStyles = makeStyles((colors) => ({
  countRow: {
    height: 60,
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
  },
  countText: { flex: 1 },
  countLabel: { ...type.rowTitle, color: colors.ink },
  countHint: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  actions: { marginTop: spacing.xxl, gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  quiet: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radii.control,
    backgroundColor: colors.fill,
  },
  quietPressed: { backgroundColor: colors.fillPressed },
  quietLabel: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.ink },
  privacy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: 18,
  },
  privacyText: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
}));

export default PaperActions;
