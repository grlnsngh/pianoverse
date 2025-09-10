import {
  View,
  Text,
  ScrollView,
  Alert,
  ToastAndroid,
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { icons, images } from "@/constants";
import { SECONDARY_COLOR, PRIMARY_COLOR } from "@/constants/colors";
import Logo from "../components/Logo";
import EnhancedFormField from "../components/EnhancedFormField";
import { Link, router, useLocalSearchParams } from "expo-router";
import CustomButton from "../components/CustomButton";
import { updatePassword } from "@/lib/appwrite";

const { width, height } = Dimensions.get("window");

const ResetPassword = () => {
  const { userId, secret, expire } = useLocalSearchParams();
  const [deepLinkParams, setDeepLinkParams] = useState<{ userId?: string; secret?: string; expire?: string }>({});

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    password: "",
    confirmPassword: "",
  });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(30)).current;
  const buttonAnim = useRef(new Animated.Value(1)).current;
  const decorAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations when component mounts
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(formAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Start decorative animation loop
    const decorAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(decorAnim, {
            toValue: 1.1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(decorAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    decorAnimation();
  }, []);

  // Handle URL parameters from web redirect
  useEffect(() => {
    const getUrlParams = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        const secret = urlParams.get('secret');
        const expire = urlParams.get('expire');
        
        if (userId && secret) {
          setDeepLinkParams({
            userId: userId || undefined,
            secret: secret || undefined,
            expire: expire || undefined,
          });
        }
      } catch (error) {
        console.error("Error parsing URL params:", error);
      }
    };

    getUrlParams();
  }, []);

  const validateForm = () => {
    const newErrors = { password: "", confirmPassword: "" };
    let isValid = true;

    // Password validation
    if (!form.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    // Confirm password validation
    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
      isValid = false;
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const submit = async () => {
    if (!validateForm()) {
      // Button shake animation for validation error
      Animated.sequence([
        Animated.timing(buttonAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    // Use parameters from either URL or deep link
    const finalUserId = (userId as string) || deepLinkParams.userId;
    const finalSecret = (secret as string) || deepLinkParams.secret;

    if (!finalUserId || !finalSecret) {
      Alert.alert("Error", "Invalid reset link. Please request a new password reset.");
      return;
    }

    setSubmitting(true);

    // Button scale animation for successful press
    Animated.timing(buttonAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();

    try {
      await updatePassword(finalUserId, finalSecret, form.password);

      ToastAndroid.show(
        "Password updated successfully! Please sign in with your new password.",
        ToastAndroid.LONG
      );
      router.replace("/sign-in");
    } catch (error) {
      // Reset button animation on error
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();

      if (error instanceof Error) {
        Alert.alert("Reset Failed", error.message);
      } else {
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      }
    } finally {
      setSubmitting(false);
      // Reset button animation
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Background decorative elements */}
          <Animated.View
            style={[
              styles.backgroundDecor,
              { transform: [{ scale: decorAnim }] },
            ]}
          >
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />
            <View style={[styles.decorCircle, styles.decorCircle3]} />
          </Animated.View>

          <View style={styles.contentContainer}>
            {/* Animated Logo */}
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  opacity: logoAnim,
                  transform: [
                    {
                      translateY: logoAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-30, 0],
                      }),
                    },
                    {
                      scale: logoAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Logo />
            </Animated.View>

            {/* Welcome Section */}
            <Animated.View
              style={[
                styles.welcomeSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.welcomeTitle}>Reset Password</Text>
              <Text style={styles.welcomeSubtitle}>
                Enter your new password below
              </Text>
            </Animated.View>

            {/* Form Section */}
            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: formAnim }],
                },
              ]}
            >
              <View style={styles.formWrapper}>
                <EnhancedFormField
                  title="New Password"
                  value={form.password}
                  handleChangeText={(e: string) => {
                    setForm({ ...form, password: e });
                    if (errors.password) setErrors({ ...errors, password: "" });
                  }}
                  autoCapitalize="none"
                  error={errors.password}
                  otherStyles="mb-4"
                  secureTextEntry
                />

                <EnhancedFormField
                  title="Confirm New Password"
                  value={form.confirmPassword}
                  handleChangeText={(e: string) => {
                    setForm({ ...form, confirmPassword: e });
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
                  }}
                  autoCapitalize="none"
                  error={errors.confirmPassword}
                  otherStyles="mb-4"
                  secureTextEntry
                />

                <Animated.View style={{ transform: [{ scale: buttonAnim }] }}>
                  <CustomButton
                    title={isSubmitting ? "Updating..." : "Update Password"}
                    handlePress={submit}
                    containerStyles="mt-8"
                    isLoading={isSubmitting}
                  />
                </Animated.View>

                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.divider} />
                </View>

                <View style={styles.signUpContainer}>
                  <Text style={styles.signUpText}>Remember your password? </Text>
                  <Link href="/sign-in" style={styles.signUpLink}>
                    <Text style={styles.signUpLinkText}>Sign In</Text>
                  </Link>
                </View>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: height,
  },
  backgroundDecor: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 100,
    opacity: 0.1,
  },
  decorCircle1: {
    width: 200,
    height: 200,
    backgroundColor: SECONDARY_COLOR,
    top: -50,
    right: -50,
  },
  decorCircle2: {
    width: 150,
    height: 150,
    backgroundColor: SECONDARY_COLOR,
    bottom: 100,
    left: -75,
  },
  decorCircle3: {
    width: 100,
    height: 100,
    backgroundColor: SECONDARY_COLOR,
    top: height * 0.4,
    right: width * 0.2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#D1D5DB",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  formContainer: {
    width: "100%",
  },
  formWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  dividerText: {
    color: "#D1D5DB",
    paddingHorizontal: 10,
    fontSize: 14,
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  signUpText: {
    color: "#D1D5DB",
    fontSize: 14,
  },
  signUpLink: {
    marginLeft: 5,
  },
  signUpLinkText: {
    color: SECONDARY_COLOR,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ResetPassword;
