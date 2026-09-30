import { format } from "date-fns";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import {
  AddFlowFooter,
  AddFlowHeading,
  AddFlowTopBar,
} from "@/components/AddFlowChrome";
import {
  Button,
  Group,
  KeysLoader,
  PianoPhoto,
  ProgressBar,
  SuccessMark,
} from "@/components/ui";
import { PIANO_CATEGORY } from "@/constants/Piano";
import { colors, fonts, radii, spacing, type } from "@/constants/theme";
import { useGlobalContext } from "@/context/GlobalProvider";
import { createPianoEntry, toPianoItem } from "@/lib/appwrite";
import { resetCreateForm, setActiveTab } from "@/redux/navigation/actions";
import { addPianoItem } from "@/redux/pianos/actions";
import { scheduleRentalDueNotification } from "@/services/notifications";
import { goToAddStep } from "@/utils/addFlow";
import { showDialog } from "@/utils/dialog";
import { formatRupees } from "@/utils/money";
import { categoryLabelOf } from "@/utils/pianoDisplay";
import {
  createEmptyPianoForm,
  parsePianoForm,
  PianoFormState,
  photoUri,
  toPianoEntryInput,
} from "@/utils/pianoForm";
import { formatMobile } from "@/utils/validation";

const day = (date: Date) => format(new Date(date), "d MMM yyyy");

type Stage = "review" | "publishing" | "published";

type Row = { label: string; value: string; strong?: boolean; tabular?: boolean };

/** What the category's part of the review says: its heading and its rows. */
const categoryRows = (form: PianoFormState): { title: string; rows: Row[] } => {
  switch (form.category) {
    case PIANO_CATEGORY.RENTABLE:
      return {
        title: "Rental",
        rows: [
          { label: "Customer", value: form.rentalCustomerName },
          { label: "Mobile", value: formatMobile(form.rentalCustomerMobileNumber), tabular: true },
          { label: "Address", value: form.rentalCustomerAddress },
          {
            label: "Period",
            value: `${day(form.rentalStartDate)} – ${day(form.rentalEndDate)}`,
            tabular: true,
          },
          { label: "Rent", value: formatRupees(form.rentalPrice), strong: true, tabular: true },
        ],
      };
    case PIANO_CATEGORY.EVENTS:
      return {
        title: "Event",
        rows: [
          {
            label: "Purchase price",
            value: formatRupees(form.eventPurchasePrice),
            strong: true,
            tabular: true,
          },
          { label: "Bought from", value: form.eventPurchaseFrom },
          { label: "Model number", value: form.eventModelNumber },
          { label: "B number", value: form.eventBNumber },
        ],
      };
    case PIANO_CATEGORY.ON_SALE:
      return {
        title: "Sale",
        rows: [
          {
            label: "Sale price",
            value: formatRupees(form.onSalePrice),
            strong: true,
            tabular: true,
          },
          { label: "Bought from", value: form.onSalePurchaseFrom },
          { label: "Import date", value: day(form.onSaleImportDate), tabular: true },
        ],
      };
    default:
      return {
        title: "Warehouse",
        rows: [
          {
            label: "Stored since",
            value: day(form.warehouseStoredSinceDate),
            tabular: true,
          },
        ],
      };
  }
};

const ReviewRow = ({ label, value, strong, tabular }: Row) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text
      style={[
        styles.rowValue,
        strong && { fontFamily: fonts.bold },
        tabular && { fontVariant: ["tabular-nums"] },
      ]}
    >
      {value}
    </Text>
  </View>
);

const Section = ({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: Row[];
  onEdit: () => void;
}) => (
  <View>
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${title.toLowerCase()}`}
        hitSlop={{ top: 6, bottom: 6 }}
        style={styles.edit}
      >
        <Text style={styles.editText}>Edit</Text>
      </Pressable>
    </View>
    <Group>
      {rows.map((row) => (
        <ReviewRow key={row.label} {...row} />
      ))}
    </Group>
  </View>
);

/**
 * The third step of adding a piano: a summary to check (Add3Review board),
 * then the piano is saved while the keys loader shows how far the photos have
 * got (Publishing), and last a screen saying it worked (Published).
 */
const Review = () => {
  const { user } = useGlobalContext();
  const dispatch = useDispatch();
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>("review");
  const [uploaded, setUploaded] = useState({ finished: 0, total: 0 });
  const [added, setAdded] = useState<{ id: string; title: string } | null>(null);

  // Parse the form data from the navigation params (once, not on every render)
  const form = useMemo(
    () =>
      params.formData
        ? parsePianoForm(params.formData as string)
        : createEmptyPianoForm(),
    [params.formData]
  );
  const cover = form.photos[0] ? photoUri(form.photos[0]) : undefined;
  const photoCount = form.photos.length;
  const details = categoryRows(form);

  // Hide the default header. Once it is saving or saved there is no going
  // back: a swipe would only return to a form that has been cleared.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      gestureEnabled: stage === "review",
    });
  }, [navigation, stage]);

  /** Leaves the whole Add flow (this screen and the form under it) for the tabs. */
  const leave = () => {
    if (router.canDismiss()) router.dismissAll();
    else router.replace("/home");
  };

  // Android's back button: not while saving, and "Done" once it has saved
  useEffect(() => {
    if (stage === "review") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stage === "published") leave();
      return true;
    });
    return () => subscription.remove();
  }, [stage]);

  const handlePublish = async () => {
    if (!user || !user.accountId) {
      Alert.alert("Error", "You must be logged in to publish a piano entry.");
      return;
    }

    setUploaded({ finished: 0, total: 0 });
    setStage("publishing");
    try {
      const createdPiano = await createPianoEntry(
        toPianoEntryInput(form, { user }),
        (finished, total) => setUploaded({ finished, total })
      );
      await scheduleRentalDueNotification(createdPiano);
      dispatch(addPianoItem(toPianoItem(createdPiano)) as any);
      // The form under this screen starts over, and the Pianos tab is where
      // Done leaves to
      dispatch(resetCreateForm() as any);
      dispatch(setActiveTab("pianos") as any);
      setAdded({ id: createdPiano.$id, title: form.title });
      setStage("published");
    } catch (error) {
      const errorMessage = (error as Error).message;
      setStage("review");
      Alert.alert("Error while uploading", errorMessage);
    }
  };

  const cancel = () =>
    showDialog({
      title: "Stop adding this piano?",
      message: "What you entered so far will be lost.",
      actions: [
        {
          label: "Discard",
          tone: "destructive",
          onPress: () => {
            // The form is finished with, so leaving doesn't ask a second time
            dispatch(resetCreateForm() as any);
            leave();
          },
        },
        { label: "Keep going", emphasis: true, onPress: () => {} },
      ],
    });

  const editStep = (step: 1 | 2) => {
    goToAddStep(step);
    router.back();
  };

  if (stage === "publishing") {
    const { finished, total } = uploaded;
    const message =
      total > 0 && finished < total
        ? `Uploading photo ${finished + 1} of ${total}`
        : "Saving your piano";

    return (
      <SafeAreaView style={styles.whiteScreen}>
        <View style={styles.centre} accessibilityLiveRegion="polite">
          <KeysLoader size={56} accessibilityLabel="Adding your piano" />
          <Text style={styles.busyTitle} accessibilityRole="header">
            Adding your piano
          </Text>
          <Text style={styles.busyMessage}>{message}</Text>
          <ProgressBar
            progress={finished / (total + 1)}
            accessibilityLabel="Adding your piano"
            style={styles.busyBar}
          />
          <Text style={styles.busyNote}>Keep the app open until this finishes.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (stage === "published" && added) {
    const isRental = form.category === PIANO_CATEGORY.RENTABLE;

    return (
      <SafeAreaView edges={["top"]} style={styles.whiteScreen}>
        <View style={styles.centre}>
          <SuccessMark />
          <Text style={styles.doneTitle} accessibilityRole="header">
            Piano added
          </Text>
          <Text style={styles.doneMessage}>
            {`${added.title} is now in your stock.${
              isRental ? " You’ll get reminders before its rental ends." : ""
            }`}
          </Text>
        </View>

        {/* 28 below the buttons on an iPhone with a home indicator, 16 elsewhere */}
        <View
          style={[
            styles.doneButtons,
            { paddingBottom: Math.max(insets.bottom - 6, spacing.lg) },
          ]}
        >
          <Button
            title="View piano"
            onPress={() => {
              leave();
              router.push(`/detail/${added.id}`);
            }}
          />
          <Button
            title="Add another"
            variant="secondary"
            // The form under this screen was cleared when the piano was saved
            onPress={() => router.back()}
          />
          <Button title="Done" variant="text" size="compact" onPress={leave} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <AddFlowTopBar onCancel={cancel} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <AddFlowHeading
          step={3}
          title="Ready to add?"
          subtitle="Check the details. You can edit them later."
        />

        <View style={styles.body}>
          <View style={styles.summary}>
            <PianoPhoto
              id={form.title || "new-piano"}
              uri={cover}
              style={styles.thumb}
            />
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle} numberOfLines={2}>
                {form.title}
              </Text>
              <Text style={styles.summaryMeta}>
                {`${categoryLabelOf(form.category)} · ${photoCount} ${
                  photoCount === 1 ? "photo" : "photos"
                }`}
              </Text>
            </View>
          </View>

          <Section
            title="Piano"
            onEdit={() => editStep(1)}
            rows={[
              { label: "Make", value: form.make },
              { label: "Company", value: form.companyAssociated },
              { label: "Purchased", value: day(form.dateOfPurchase), tabular: true },
              ...(form.description.trim()
                ? [{ label: "Notes", value: form.description.trim() }]
                : []),
            ]}
          />

          <Section title={details.title} rows={details.rows} onEdit={() => editStep(2)} />
        </View>
      </ScrollView>

      <AddFlowFooter>
        <Button
          title="Back"
          variant="secondary"
          onPress={() => router.back()}
          style={styles.back}
        />
        <Button title="Add piano" onPress={handlePublish} style={styles.primary} />
      </AddFlowFooter>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.grouped },
  whiteScreen: { flex: 1, backgroundColor: colors.white },
  content: { paddingBottom: spacing.xxl },
  body: { paddingHorizontal: spacing.screen },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: spacing.xl,
  },
  thumb: { width: 64, height: 64, borderRadius: radii.input },
  summaryText: { flex: 1 },
  summaryTitle: { ...type.section, letterSpacing: -0.2, color: colors.ink },
  summaryMeta: { ...type.secondary, color: colors.ink2 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.lg,
  },
  sectionTitle: { ...type.status, color: colors.ink2 },
  edit: {
    height: 32,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  editText: { fontFamily: fonts.bold, fontSize: 14, color: colors.brandText },
  row: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  rowLabel: { ...type.body, color: colors.ink2 },
  rowValue: {
    ...type.bodyMedium,
    flexShrink: 1,
    textAlign: "right",
    color: colors.ink,
  },
  back: { width: 104 },
  primary: { flex: 1 },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  busyTitle: {
    marginTop: spacing.xxxl,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.36,
    color: colors.ink,
    textAlign: "center",
  },
  busyMessage: {
    marginTop: 6,
    ...type.body,
    color: colors.ink2,
    textAlign: "center",
  },
  busyBar: { marginTop: spacing.xxl },
  busyNote: {
    marginTop: spacing.xxl,
    ...type.caption,
    fontFamily: fonts.regular,
    color: colors.ink2,
    textAlign: "center",
  },
  doneTitle: {
    marginTop: 28,
    ...type.pianoTitle,
    color: colors.ink,
    textAlign: "center",
  },
  doneMessage: {
    marginTop: spacing.sm,
    ...type.body,
    color: colors.ink2,
    textAlign: "center",
  },
  doneButtons: {
    gap: 10,
    paddingHorizontal: spacing.xxl,
  },
});

export default Review;
