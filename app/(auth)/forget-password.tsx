import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import AuthScreen, { AuthError } from "@/components/AuthScreen";
import { Button, Field } from "@/components/ui";
import { spacing } from "@/constants/theme";
import { sendPasswordRecovery } from "@/lib/appwrite";
import { emailError, resetFailure } from "@/utils/authForms";
import { showToast } from "@/utils/toast";

/**
 * Reset password (Forgot board): the email the link is sent to. Once it is
 * sent the app goes back to Sign in and says to look in the inbox.
 */
const ForgetPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [failure, setFailure] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  const change = (text: string) => {
    setEmail(text);
    if (error) setError("");
    if (failure) setFailure("");
  };

  const submit = async () => {
    const found = emailError(email);
    setError(found);
    if (found) return;

    setSubmitting(true);
    setFailure("");
    try {
      await sendPasswordRecovery(email.trim());
      showToast("Password reset email sent! Please check your inbox.", "long");
      router.replace("/sign-in");
    } catch (caught) {
      setFailure(resetFailure(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title="Reset password"
      subtitle="Enter your email and we will send you a link to choose a new password."
      busy={isSubmitting}
      backLabel="Back to sign in"
      onBack={() => (router.canGoBack?.() ? router.back() : router.replace("/sign-in"))}
    >
      {failure ? <AuthError message={failure} /> : null}

      <View style={failure ? styles.fieldsAfterError : styles.fields}>
        <Field
          label="Email"
          value={email}
          onChangeText={change}
          onBlur={() => setError(emailError(email))}
          error={error}
          disabled={isSubmitting}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={submit}
        />
      </View>

      <Button
        title="Send reset link"
        loading={isSubmitting}
        loadingTitle="Sending"
        onPress={submit}
        style={styles.button}
      />
    </AuthScreen>
  );
};

const styles = StyleSheet.create({
  fields: { marginTop: spacing.xxxl },
  fieldsAfterError: { marginTop: spacing.xl },
  button: { marginTop: spacing.xxl },
});

export default ForgetPassword;
