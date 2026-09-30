import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useStore } from "react-redux";
import {
  AddFlowFooter,
  AddFlowHeading,
  AddFlowTopBar,
} from "@/components/AddFlowChrome";
import PianoBasicsFields from "@/components/PianoBasicsFields";
import PianoCategoryFields from "@/components/PianoCategoryFields";
import PianoPhotoField from "@/components/PianoPhotoField";
import { Button } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import usePianoPhotos from "@/lib/usePianoPhotos";
import { RootState } from "@/redux/store";
import { AddStep, setAddStepListener } from "@/utils/addFlow";
import { showDialog } from "@/utils/dialog";
import {
  basicsProblem,
  categoryProblem,
  createEmptyPianoForm,
  hasEntries,
  parsePianoForm,
  PianoFormState,
} from "@/utils/pianoForm";

const HEADINGS: Record<AddStep, { title: string; subtitle: string }> = {
  1: { title: "About the piano", subtitle: "You can change anything later." },
  2: {
    title: "How will it be used?",
    subtitle: "The fields below change with your choice.",
  },
};

/**
 * The first two steps of adding a piano (Add1Basics and Add2Details boards):
 * the photos and basics, then how it will be used with the details of that.
 * The third step, the review, is its own screen above this one, so this one
 * keeps what was typed while the review is open.
 */
const Create = () => {
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const store = useStore<RootState>();
  const scroll = useRef<ScrollView>(null);
  const [step, setStep] = useState<AddStep>(1);
  const [form, setForm] = useState<PianoFormState>(() => {
    // Coming back from the review screen, carry on with the same form
    if (params.formData) {
      try {
        return parsePianoForm(params.formData as string);
      } catch (error) {
        console.error("Error parsing form data:", error);
      }
    }
    return createEmptyPianoForm();
  });
  const updateForm = (changes: Partial<PianoFormState>) =>
    setForm((current) => ({ ...current, ...changes }));
  const { addPhoto, removePhoto, makeCover } = usePianoPhotos(setForm);

  // Start over once the piano has been published from the review screen
  const createFormResetCount = useSelector(
    (state: RootState) => state.navigation.createFormResetCount
  );
  // The count this screen has already started over for
  const resetsSeen = useRef(createFormResetCount);
  useEffect(() => {
    if (createFormResetCount > 0) {
      setForm(createEmptyPianoForm());
      setStep(1);
    }
    resetsSeen.current = createFormResetCount;
  }, [createFormResetCount]);

  // The review's Edit links come back to the step they are about
  useEffect(() => setAddStepListener(setStep), []);

  // Each step starts at the top
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  // Android's back button goes back a step before it leaves
  useEffect(() => {
    if (step === 1) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setStep(1);
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  // Leaving with something entered (Cancel, Android's back button on the
  // first step, or a swipe back) asks first, instead of losing it
  const latestForm = useRef(form);
  latestForm.current = form;
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (!hasEntries(latestForm.current)) return;
        // The piano was published or the flow cancelled from the review: the
        // form is finished with, even if this screen hasn't cleared it yet
        if (store.getState().navigation.createFormResetCount !== resetsSeen.current) {
          return;
        }
        event.preventDefault();
        const discard = () => navigation.dispatch(event.data.action);

        showDialog({
          title: "Stop adding this piano?",
          message: "What you entered so far will be lost.",
          actions: [
            { label: "Discard", tone: "destructive", onPress: discard },
            { label: "Keep going", emphasis: true, onPress: () => {} },
          ],
        });
      }),
    [navigation, store]
  );

  const goOn = () => {
    const problem = step === 1 ? basicsProblem(form) : categoryProblem(form);
    if (problem) {
      Alert.alert(problem.title, problem.message);
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    router.push({
      pathname: "/review",
      params: { formData: JSON.stringify(form) },
    });
  };

  const { title, subtitle } = HEADINGS[step];

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <AddFlowTopBar onCancel={() => router.back()} />

        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <AddFlowHeading step={step} title={title} subtitle={subtitle} />

          <View style={styles.fields}>
            {step === 1 ? (
              <PianoBasicsFields
                form={form}
                onChange={updateForm}
                photo={
                  <PianoPhotoField
                    photos={form.photos}
                    onPick={addPhoto}
                    onRemove={removePhoto}
                    onMakeCover={makeCover}
                  />
                }
              />
            ) : (
              <PianoCategoryFields form={form} onChange={updateForm} />
            )}
          </View>
        </ScrollView>

        {/* Always pressable: it says what's still missing */}
        <AddFlowFooter>
          {step === 2 && (
            <Button
              title="Back"
              variant="secondary"
              onPress={() => setStep(1)}
              style={styles.back}
            />
          )}
          <Button
            title="Continue"
            onPress={goOn}
            style={styles.primary}
          />
        </AddFlowFooter>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.grouped },
  content: { paddingBottom: spacing.xxl },
  fields: { paddingHorizontal: spacing.screen, marginTop: spacing.xl },
  back: { width: 104 },
  primary: { flex: 1 },
});

export default Create;
