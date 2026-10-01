import { toPianoItem, updatePianoEntry } from "@/lib/appwrite";
import { updatePianoItem } from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import {
  createEmptyPianoForm,
  pianoFormProblem,
  PianoFormState,
  pianoToForm,
  toPianoEntryInput,
} from "@/utils/pianoForm";
import { getPianoPhotos } from "@/utils/photos";
import { showDialog } from "@/utils/dialog";
import { showToast } from "@/utils/toast";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { AddFlowFooter, AddFlowTopBar } from "@/components/AddFlowChrome";
import PianoFormFields from "@/components/PianoFormFields";
import PianoPhotoField from "@/components/PianoPhotoField";
import { Button } from "@/components/ui";
import { colors, spacing, type } from "@/constants/theme";
import usePianoPhotos from "@/lib/usePianoPhotos";
import { scheduleRentalDueNotification } from "@/services/notifications";

const EditScreen = () => {
  const { id } = useLocalSearchParams();
  const pianosList = useSelector((state: RootState) => state.pianos.items);
  const user = useSelector((state: RootState) => state.users.user);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const filteredPiano: PianoItem | undefined = pianosList.find(
    (piano) => piano.$id === id
  );

  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<PianoFormState>(() =>
    filteredPiano ? pianoToForm(filteredPiano) : createEmptyPianoForm()
  );
  const updateForm = (changes: Partial<PianoFormState>) =>
    setForm((current) => ({ ...current, ...changes }));
  const { addPhoto, removePhoto, makeCover } = usePianoPhotos(setForm);

  // The form as it was opened, to tell whether anything has been changed
  const [openedForm] = useState(form);
  const hasChanges = useRef(false);
  hasChanges.current = JSON.stringify(form) !== JSON.stringify(openedForm);
  // Set once the changes are saved, so leaving doesn't ask about them
  const saved = useRef(false);

  // Going back (Cancel, or Android's back button) with changes that weren't
  // saved asks first, instead of losing them
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (saved.current || !hasChanges.current) return;
        event.preventDefault();
        const discard = () => navigation.dispatch(event.data.action);

        showDialog({
          title: "Discard changes?",
          message: "You have unsaved changes to this piano.",
          actions: [
            { label: "Discard", tone: "destructive", onPress: discard },
            { label: "Keep editing", emphasis: true, onPress: () => {} },
          ],
        });
      }),
    [navigation]
  );

  if (!filteredPiano) {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <AddFlowTopBar title="Edit piano" onCancel={() => router.back()} />
        <Text style={styles.missing}>Piano not found</Text>
      </SafeAreaView>
    );
  }

  const handleOnSubmit = async () => {
    if (!user || !user.accountId) {
      Alert.alert("Error", "You must be logged in to update a piano entry.");
      return;
    }

    const problem = pianoFormProblem(form);
    if (problem) {
      Alert.alert(problem.title, problem.message);
      return;
    }

    try {
      setUploading(true);
      const updatedPiano = await updatePianoEntry(
        id.toString(),
        toPianoEntryInput(form, { user }),
        getPianoPhotos(filteredPiano)
      );
      // The end date or category may have changed
      await scheduleRentalDueNotification(updatedPiano);
      dispatch(updatePianoItem(toPianoItem(updatedPiano)) as any);
      saved.current = true;
      if (router.canGoBack()) router.back();
      else router.replace("/home");
      showToast("Piano entry updated successfully", { variant: "success" });
    } catch (error) {
      const errorMessage = (error as Error).message;
      Alert.alert("Error while uploading", errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <AddFlowTopBar title="Edit piano" onCancel={() => router.back()} />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <PianoFormFields
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
        </ScrollView>

        <AddFlowFooter>
          <Button
            title="Save changes"
            loading={uploading}
            loadingTitle="Saving"
            onPress={handleOnSubmit}
            style={styles.save}
          />
        </AddFlowFooter>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.grouped },
  content: { padding: spacing.screen, paddingTop: spacing.sm },
  save: { flex: 1 },
  missing: {
    ...type.body,
    color: colors.ink2,
    textAlign: "center",
    marginTop: spacing.xxxl,
  },
});

export default EditScreen;
