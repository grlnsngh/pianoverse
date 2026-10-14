import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormPreview } from "@/components/FormThumbnail";
import PaperSavedSheet from "@/components/PaperSavedSheet";
import { Button, FormRow, Group, Icon, Spinner, StateView, Stepper } from "@/components/ui";
import type { IconName } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import { loadLetterhead, saveLetterhead } from "@/lib/letterheadStorage";
import { savePaperForm } from "@/lib/paperPdf";
import usePaperPdf from "@/lib/usePaperPdf";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import {
  EMPTY_LETTERHEAD,
  LETTERHEAD_LIMITS,
  type Letterhead,
} from "@/utils/letterhead";
import { MAX_COPIES, paperFormById, type PaperForm } from "@/utils/paperForms/catalog";

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/paper-forms");
};

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

/** A form's screen, once the form is known. */
const PaperFormScreen = ({ form }: { form: PaperForm }) => {
  const colors = useColors();
  const styles = useStyles();
  const [letterhead, setLetterhead] = useState<Letterhead>(EMPTY_LETTERHEAD);
  const [count, setCount] = useState(form.defaultCount);
  // A detail typed before the saved ones were read is kept, not overwritten by them
  const typed = useRef(new Set<keyof Letterhead>());

  useEffect(() => {
    let active = true;
    loadLetterhead().then((saved) => {
      if (!active) return;
      setLetterhead((current) => {
        const merged = { ...saved };
        typed.current.forEach((key) => {
          merged[key] = current[key];
        });
        return merged;
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const change = (key: "business" | "phone") => (text: string) => {
    typed.current.add(key);
    setLetterhead((current) => ({ ...current, [key]: text }));
  };
  const remember = () => saveLetterhead(letterhead);

  const pdf = usePaperPdf(async () => {
    await remember();
    return savePaperForm(form.id, letterhead, count);
  });
  const busy = pdf.busy !== null;

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewArea}>
          <FormPreview id={form.id} />
          <Text style={styles.previewNote}>A4 · {form.pageNote}</Text>
          <Text style={styles.previewContents}>{form.contents}</Text>
        </View>

        <Group
          title="Printed at the top"
          footer="Leave them empty to write by hand. Kept on this phone only."
          style={styles.section}
        >
          <FormRow
            label="Business"
            placeholder="Your business name"
            input={{
              value: letterhead.business,
              onChangeText: change("business"),
              onEndEditing: remember,
              maxLength: LETTERHEAD_LIMITS.business,
              autoCapitalize: "words",
              returnKeyType: "done",
            }}
          />
          <FormRow
            label="Phone"
            placeholder="Optional"
            input={{
              value: letterhead.phone,
              onChangeText: change("phone"),
              onEndEditing: remember,
              maxLength: LETTERHEAD_LIMITS.phone,
              keyboardType: "phone-pad",
              returnKeyType: "done",
            }}
          />
        </Group>

        <View style={[styles.countRow, styles.sectionSmall]}>
          <View style={styles.countText}>
            <Text style={styles.countLabel}>{form.countLabel}</Text>
            <Text style={styles.countHint}>{form.countHint}</Text>
          </View>
          <Stepper
            value={count}
            onChange={setCount}
            min={1}
            max={MAX_COPIES}
            unit={form.countLabel.toLowerCase()}
          />
        </View>

        <View style={styles.actions}>
          <Button
            title="Save PDF"
            loading={pdf.busy === "save"}
            loadingTitle="Making PDF"
            disabled={busy && pdf.busy !== "save"}
            onPress={pdf.save}
          />
          <View style={styles.actionRow}>
            <QuietButton
              icon="printer"
              title="Print"
              busy={pdf.busy === "print"}
              disabled={busy && pdf.busy !== "print"}
              onPress={pdf.print}
            />
            <QuietButton
              icon="share"
              title="Share"
              busy={pdf.busy === "share"}
              disabled={busy && pdf.busy !== "share"}
              onPress={pdf.share}
            />
          </View>
        </View>

        <View style={styles.privacy}>
          <Icon name="lock" size={16} color={colors.ink2} strokeWidth={2} />
          <Text style={styles.privacyText}>Made on this phone. What you write stays with you.</Text>
        </View>
      </ScrollView>

      <PaperSavedSheet
        visible={pdf.sheetOpen}
        pdf={pdf.pdf}
        title={form.title}
        onOpen={pdf.openSaved}
        onPrint={pdf.printSaved}
        onShare={pdf.shareSaved}
        onClose={pdf.closeSheet}
      />
    </>
  );
};

/**
 * One paper form (PaperFormDetail board), opened from Paper forms: a drawing
 * of the page, the business name and phone to print at the top, how many
 * copies, and Save PDF, Print and Share.
 */
const PaperFormDetail = () => {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const form = paperFormById(id);

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <View style={styles.bar}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Icon name="chevronLeft" size={24} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.barTitle} accessibilityRole="header" numberOfLines={1}>
          {form?.title ?? "Paper forms"}
        </Text>
        <View style={styles.back} />
      </View>

      {form ? (
        <PaperFormScreen form={form} />
      ) : (
        <StateView
          icon="document"
          title="This form isn’t here"
          message="It may have been renamed. Pick it again from the list."
          actionLabel="See all forms"
          actionVariant="secondary"
          onAction={() => router.replace("/paper-forms")}
        />
      )}
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.grouped },
  bar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  barTitle: { ...type.sheetTitle, flex: 1, textAlign: "center", color: colors.ink },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  previewArea: { alignItems: "center", paddingTop: spacing.lg },
  previewNote: {
    marginTop: 10,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkBody,
  },
  previewContents: {
    ...type.caption,
    fontFamily: fonts.regular,
    textAlign: "center",
    color: colors.ink2,
  },
  section: { marginTop: spacing.xxl },
  sectionSmall: { marginTop: spacing.xl },
  countRow: {
    height: 60,
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
  actionRow: { flexDirection: "row", gap: 10 },
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

export default PaperFormDetail;
