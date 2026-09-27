import { icons } from "@/constants";
import { Image } from "expo-image";
import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** A panel that slides up from the bottom; tapping outside closes it. */
const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  title,
  onClose,
  children,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View className="flex-1 justify-end bg-black/60">
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1" />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="bg-primary-100 rounded-t-3xl px-5 pt-5 pb-8 border-t border-primary-300 max-h-[640px]">
          <View className="flex-row items-center justify-between">
            <Text className="text-white text-xl font-psemibold">{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-9 h-9 rounded-full bg-primary-300 items-center justify-center"
              accessibilityLabel="Close"
            >
              <Image
                source={icons.close}
                className="w-4 h-4"
                tintColor="#CDCDE0"
              />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  </Modal>
);

export default BottomSheet;
