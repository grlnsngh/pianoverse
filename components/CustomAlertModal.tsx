import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { icons } from "@/constants";

const { width } = Dimensions.get("window");

interface CustomAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  type?: "default" | "destructive";
}

const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  type = "default",
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header with icon */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Image
                source={type === "destructive" ? icons.trash : icons.close}
                style={styles.icon}
                tintColor="#FFA001"
              />
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                type === "destructive"
                  ? styles.destructiveButton
                  : styles.confirmButton,
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.confirmButtonText,
                  type === "destructive" && styles.destructiveButtonText,
                ]}
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "#161622",
    borderRadius: 20,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFA001",
  },
  header: {
    marginBottom: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 160, 1, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFA001",
  },
  icon: {
    width: 28,
    height: 28,
  },
  content: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFA001",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: "Poppins-Bold",
  },
  message: {
    fontSize: 16,
    color: "#CDCDE0",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Poppins-Regular",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#2A2A3A",
    borderWidth: 1,
    borderColor: "#3A3A4A",
  },
  confirmButton: {
    backgroundColor: "#FFA001",
  },
  destructiveButton: {
    backgroundColor: "#DC2626",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#CDCDE0",
    fontFamily: "Poppins-SemiBold",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#161622",
    fontFamily: "Poppins-SemiBold",
  },
  destructiveButtonText: {
    color: "#FFFFFF",
  },
});

export default CustomAlertModal;
