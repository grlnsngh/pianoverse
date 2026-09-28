import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  createEmptyPianoForm,
  parsePianoForm,
  pianoFormProblem,
  PianoFormState,
} from "@/utils/pianoForm";
import { PhotoSource, pickPianoPhoto } from "@/utils/photo";
import CustomButton from "../components/CustomButton";
import PianoFormFields from "../components/PianoFormFields";
import PianoPhotoField from "../components/PianoPhotoField";
import { PIANO_CATEGORY } from "../constants/Piano";

const CATEGORY_STEP_NAMES: Record<string, string> = {
  [PIANO_CATEGORY.RENTABLE]: "Rental Details",
  [PIANO_CATEGORY.WAREHOUSE]: "Warehouse Details",
  [PIANO_CATEGORY.EVENTS]: "Event Details",
  [PIANO_CATEGORY.ON_SALE]: "Sale Details",
};

const Create = () => {
  const params = useLocalSearchParams();
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

  // Start over once the piano has been published from the review screen
  const createFormResetCount = useSelector(
    (state: RootState) => state.navigation.createFormResetCount
  );
  useEffect(() => {
    if (createFormResetCount > 0) setForm(createEmptyPianoForm());
  }, [createFormResetCount]);

  const calculateProgress = () => {
    const basicFields = [
      form.category,
      form.title.trim(),
      form.description.trim(),
      form.image,
      form.make,
      form.companyAssociated,
      form.dateOfPurchase,
    ];

    const basicComplete = basicFields.every(
      (field) => field !== null && field !== undefined && field !== ""
    );

    const currentStep = basicComplete ? 2 : 1;
    const totalSteps = 3;
    const stepName = basicComplete
      ? CATEGORY_STEP_NAMES[form.category] ?? "Category Details"
      : "Basic Information";

    return {
      currentStep,
      totalSteps,
      stepName,
      progress: currentStep / totalSteps,
    };
  };
  const progress = calculateProgress();

  const addPhoto = async (source: PhotoSource) => {
    const image = await pickPianoPhoto(source);
    if (image) updateForm({ image });
  };

  const handleReview = () => {
    const problem = pianoFormProblem(form);
    if (problem) {
      Alert.alert(problem.title, problem.message);
      return;
    }

    // Navigate to review screen with form data
    router.push({
      pathname: "/review",
      params: { formData: JSON.stringify(form) },
    });
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full flex justify-center px-4 my-6">
          <Text className="text-2xl text-white font-psemibold mb-4">
            Add Piano
          </Text>

          {/* Step Progress Indicator */}
          <View className="mb-8 px-4">
            {/* Step Indicators with Connecting Lines */}
            <View className="flex-row items-center justify-center mb-4">
              {[1, 2, 3].map((step) => (
                <View key={step} className="flex-row items-center">
                  {/* Step Circle */}
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
                      progress.currentStep > step
                        ? "bg-secondary border-secondary shadow-lg"
                        : progress.currentStep === step
                        ? "bg-secondary border-white shadow-lg"
                        : "bg-black-200 border-gray-600"
                    }`}
                  >
                    <Text
                      className={`font-psemibold text-xs ${
                        progress.currentStep >= step
                          ? "text-black-100"
                          : "text-gray-400"
                      }`}
                    >
                      {step}
                    </Text>
                  </View>

                  {/* Connecting Line (only between steps 1-2 and 2-3) */}
                  {step < 3 && (
                    <View className="w-12 mx-2">
                      <View className="h-1 bg-gray-600 rounded-full">
                        <View
                          className="h-full bg-secondary rounded-full"
                          style={{
                            width:
                              progress.currentStep > step
                                ? "100%"
                                : progress.currentStep === step
                                ? "50%"
                                : "0%",
                          }}
                        />
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Step Information */}
            <View className="text-center">
              <Text className="text-gray-100 text-base font-psemibold mb-1">
                Step {progress.currentStep} of {progress.totalSteps}
              </Text>
              <Text className="text-secondary text-sm font-pmedium">
                {progress.stepName}
              </Text>
            </View>
          </View>

          <PianoFormFields
            form={form}
            onChange={updateForm}
            photo={
              <PianoPhotoField
                image={form.image}
                onPick={addPhoto}
                onRemove={() => updateForm({ image: null })}
              />
            }
          />

          <CustomButton
            title={
              progress.currentStep === 2
                ? "Review & Publish"
                : "Continue Filling Form"
            }
            handlePress={progress.currentStep === 2 ? handleReview : () => {}}
            containerStyles="mt-7"
            disabled={progress.currentStep !== 2}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Create;
