import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import AuthScreen, { AuthError } from "@/components/AuthScreen";
import { Button, Field } from "@/components/ui";
import { spacing } from "@/constants/theme";
import { updatePassword } from "@/lib/appwrite";
import { confirmPasswordError, newPasswordError, resetFailure } from "@/utils/authForms";
import { showToast } from "@/utils/toast";

type Key = "password" | "confirmPassword";

const check = (key: Key, form: { password: string; confirmPassword: string }) =>
  key === "password"
    ? newPasswordError(form.password, "Enter a new password.")
    : confirmPasswordError(form.password, form.confirmPassword);

/**
 * Choose a new password, opened from the link in the reset email (the same
 * page as the Forgot board, with the two password fields). The user and the
 * secret come from the link.
 */
const ResetPassword = () => {
  const { userId, secret } = useLocalSearchParams();
  const [deepLinkParams, setDeepLinkParams] = useState<{
    userId?: string;
    secret?: string;
    expire?: string;
  }>({});
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({ password: "", confirmPassword: "" });
  const [failure, setFailure] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const fields = { password: useRef<TextInput>(null), confirmPassword: useRef<TextInput>(null) };

  // Handle URL parameters from web redirect
  useEffect(() => {
    const getUrlParams = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get("userId");
        const secret = urlParams.get("secret");
        const expire = urlParams.get("expire");

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

  const change = (key: Key) => (text: string) => {
    setForm((current) => ({ ...current, [key]: text }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: "" }));
    if (failure) setFailure("");
  };
  const leave = (key: Key) => () =>
    setErrors((current) => ({ ...current, [key]: check(key, form) }));

  const submit = async () => {
    const found = { password: check("password", form), confirmPassword: check("confirmPassword", form) };
    setErrors(found);
    if (found.password || found.confirmPassword) {
      (found.password ? fields.password : fields.confirmPassword).current?.focus();
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
    setFailure("");
    try {
      await updatePassword(finalUserId, finalSecret, form.password);
      showToast(
        "Password updated successfully! Please sign in with your new password.",
        "long"
      );
      router.replace("/sign-in");
    } catch (error) {
      setFailure(resetFailure(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title="Reset password"
      subtitle="Enter your new password below."
      busy={isSubmitting}
      backLabel="Back to sign in"
      onBack={() => router.replace("/sign-in")}
    >
      {failure ? <AuthError message={failure} /> : null}

      <View style={failure ? styles.fieldsAfterError : styles.fields}>
        <Field
          ref={fields.password}
          label="New password"
          value={form.password}
          onChangeText={change("password")}
          onBlur={leave("password")}
          error={errors.password}
          disabled={isSubmitting}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password-new"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => fields.confirmPassword.current?.focus()}
          blurOnSubmit={false}
        />
        <Field
          ref={fields.confirmPassword}
          label="Confirm new password"
          value={form.confirmPassword}
          onChangeText={change("confirmPassword")}
          onBlur={leave("confirmPassword")}
          error={errors.confirmPassword}
          disabled={isSubmitting}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password-new"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
          style={styles.next}
        />
      </View>

      <Button
        title="Update password"
        loading={isSubmitting}
        loadingTitle="Updating"
        onPress={submit}
        style={styles.button}
      />
    </AuthScreen>
  );
};

const styles = StyleSheet.create({
  fields: { marginTop: spacing.xxxl },
  fieldsAfterError: { marginTop: spacing.xl },
  next: { marginTop: spacing.md },
  button: { marginTop: spacing.xxl },
});

export default ResetPassword;
