import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import AuthScreen, { AuthDivider, AuthError, AuthSwitch } from "@/components/AuthScreen";
import GoogleButton from "@/components/GoogleButton";
import { Button, Field } from "@/components/ui";
import { spacing } from "@/constants/theme";
import { useGlobalContext } from "@/context/GlobalProvider";
import { createUser } from "@/lib/appwrite";
import useGoogleSignIn from "@/lib/useGoogleSignIn";
import {
  emailError,
  newPasswordError,
  signUpFailure,
  usernameError,
} from "@/utils/authForms";
import { showToast } from "@/utils/toast";

type Key = "username" | "email" | "password";

const check = (key: Key, value: string) =>
  key === "username"
    ? usernameError(value)
    : key === "email"
      ? emailError(value)
      : newPasswordError(value);

/**
 * Create account (SignUp board): a username, an email and a password. A
 * field's message shows when it is left or when Create account is pressed.
 */
const SignUp = () => {
  const { setUser, setIsLogged } = useGlobalContext();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState({ username: "", email: "", password: "" });
  const [failure, setFailure] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const google = useGoogleSignIn("/sign-up", setFailure);
  const working = isSubmitting || google.busy;
  const fields = {
    username: useRef<TextInput>(null),
    email: useRef<TextInput>(null),
    password: useRef<TextInput>(null),
  };

  const change = (key: Key) => (text: string) => {
    setForm((current) => ({ ...current, [key]: text }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: "" }));
    if (failure) setFailure("");
  };
  const leave = (key: Key) => () =>
    setErrors((current) => ({ ...current, [key]: check(key, form[key]) }));

  const submit = async () => {
    const found = {
      username: check("username", form.username),
      email: check("email", form.email),
      password: check("password", form.password),
    };
    setErrors(found);
    const first = (["username", "email", "password"] as Key[]).find((key) => found[key]);
    if (first) {
      fields[first].current?.focus();
      return;
    }

    setSubmitting(true);
    setFailure("");
    try {
      const result = await createUser(form.email.trim(), form.password, form.username);
      setUser(result);
      setIsLogged(true);
      router.replace("/home");
      showToast("Welcome! Account created successfully");
    } catch (error) {
      setFailure(signUpFailure(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title="Create account"
      subtitle="Takes a minute. Add your first piano right after."
      busy={working}
      onBack={() => (router.canGoBack?.() ? router.back() : router.replace("/"))}
      footer={
        <AuthSwitch
          question="Already have an account?"
          action="Sign in"
          onPress={() => router.push("/sign-in")}
        />
      }
    >
      {failure ? <AuthError message={failure} /> : null}

      <View style={failure ? styles.fieldsAfterError : styles.fields}>
        <Field
          ref={fields.username}
          label="Username"
          placeholder="Choose a username"
          value={form.username}
          onChangeText={change("username")}
          onBlur={leave("username")}
          error={errors.username}
          disabled={working}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => fields.email.current?.focus()}
          blurOnSubmit={false}
        />
        <Field
          ref={fields.email}
          label="Email"
          placeholder="you@example.com"
          value={form.email}
          onChangeText={change("email")}
          onBlur={leave("email")}
          error={errors.email}
          disabled={working}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => fields.password.current?.focus()}
          blurOnSubmit={false}
          style={styles.next}
        />
        <Field
          ref={fields.password}
          label="Password"
          placeholder="Create a password"
          value={form.password}
          onChangeText={change("password")}
          onBlur={leave("password")}
          error={errors.password}
          disabled={working}
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
        title="Create account"
        loading={isSubmitting}
        loadingTitle="Creating account"
        disabled={google.busy}
        onPress={submit}
        style={styles.button}
      />

      <AuthDivider />
      <GoogleButton onPress={google.start} loading={google.busy} disabled={isSubmitting} />
    </AuthScreen>
  );
};

const styles = StyleSheet.create({
  fields: { marginTop: spacing.xxxl },
  fieldsAfterError: { marginTop: spacing.xl },
  next: { marginTop: spacing.md },
  button: { marginTop: spacing.xxl },
});

export default SignUp;
