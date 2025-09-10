import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  showTestNotification,
  showImmediateTestNotification,
  checkNotificationStatus,
} from "../utils/notificationTest";

const NotificationTest = () => {
  const handleTestNotification = async () => {
    try {
      const result = await showTestNotification();
      if (result.success) {
        Alert.alert(
          "Test Notification Scheduled!",
          `Notification will appear in 30 seconds\nID: ${result.notificationId}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to schedule test notification");
    }
  };

  const handleImmediateNotification = async () => {
    try {
      const result = await showImmediateTestNotification();
      if (result.success) {
        Alert.alert(
          "Immediate Test Sent!",
          `Check your device now!\nID: ${result.notificationId}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send immediate test notification");
    }
  };

  const handleCheckStatus = async () => {
    try {
      const status = await checkNotificationStatus();
      Alert.alert(
        "Notification Status",
        `Permissions: ${status?.permissions.status}\nScheduled: ${status?.scheduledCount}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to get notification status");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🔔 Notification Test</Text>
        <Text style={styles.subtitle}>Test your notification system</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleTestNotification}
        >
          <Text style={styles.buttonText}>⏰ Test Notification (30s)</Text>
          <Text style={styles.buttonSubtext}>
            Schedules notification for 30 seconds from now
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleImmediateNotification}
        >
          <Text style={styles.buttonText}>🚀 Immediate Test</Text>
          <Text style={styles.buttonSubtext}>
            Shows notification immediately
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleCheckStatus}>
          <Text style={styles.buttonText}>📊 Check Status</Text>
          <Text style={styles.buttonSubtext}>
            View current notification status
          </Text>
        </TouchableOpacity>

        <View style={styles.info}>
          <Text style={styles.infoText}>
            💡 Tip: Make sure notifications are enabled in your device settings
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#FF9C01",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  buttonSubtext: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.8,
    textAlign: "center",
    marginTop: 5,
  },
  info: {
    marginTop: 40,
    padding: 15,
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
  },
  infoText: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
  },
});

export default NotificationTest;
