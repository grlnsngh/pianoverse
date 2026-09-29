import { SECONDARY_COLOR } from "@/constants/colors";
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
import { showToast } from "@/utils/toast";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import CustomButton from "@/components/CustomButton";
import PianoFormFields from "@/components/PianoFormFields";
import PianoPhotoField from "@/components/PianoPhotoField";
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

  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: SECONDARY_COLOR,
      },
      headerTintColor: "#161622",
      title: `Edit Piano`,
    });
  }, [id]);

  if (!filteredPiano) {
    return (
      <SafeAreaView className="bg-primary h-full">
        <Text className="text-lg text-white">Piano not found</Text>
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
      if (router.canGoBack()) router.back();
      else router.replace("/home");
      showToast("Piano entry updated successfully");
    } catch (error) {
      const errorMessage = (error as Error).message;
      Alert.alert("Error while uploading", errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full flex justify-center px-4 my-6">
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

          <CustomButton
            title="Save Changes"
            handlePress={handleOnSubmit}
            containerStyles="mt-7"
            isLoading={uploading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditScreen;
