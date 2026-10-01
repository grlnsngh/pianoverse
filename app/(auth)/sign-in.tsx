import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import AuthScreen, { AuthDivider, AuthError, AuthSwitch } from "@/components/AuthScreen";
import GoogleButton from "@/components/GoogleButton";
import { Button, Field } from "@/components/ui";
import { fonts, spacing } from "@/constants/theme";
import { useGlobalContext } from "@/context/GlobalProvider";
import { getCurrentUser, signIn } from "@/lib/appwrite";
import useGoogleSignIn from "@/lib/useGoogleSignIn";
import { emailError, signInFailure, signInPasswordError } from "@/utils/authForms";
import { showToast } from "@/utils/toast";
import { makeStyles } from "@/lib/ThemeContext";

type Key = "email" | "password";

const check = (key: Key, value: string) =>
  key === "email" ? emailError(value) : signInPasswordError(value);

/**
 * Sign in (SignIn, SigningIn and SignInError boards). A field's message shows
 * when it is left or when Sign in is pressed, and goes once it is typed in
 * again; a failed attempt puts a red box above the fields.
 */
const SignIn = () => {
  const styles = useStyles();
  const { setUser, setIsLogged } = useGlobalContext();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [failure, setFailure] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const google = useGoogleSignIn("/sign-in", setFailure);
  const working = isSubmitting || google.busy;
  const fields = { email: useRef<TextInput>(null), password: useRef<TextInput>(null) };

  const change = (key: Key) => (text: string) => {
    setForm((current) => ({ ...current, [key]: text }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: "" }));
    if (failure) setFailure("");
  };
  const leave = (key: Key) => () =>
    setErrors((current) => ({ ...current, [key]: check(key, form[key]) }));

  const submit = async () => {
    const found = { email: check("email", form.email), password: check("password", form.password) };
    setErrors(found);
    if (found.email || found.password) {
      // Take the person to the first thing to fix
      (found.email ? fields.email : fields.password).current?.focus();
      return;
    }

    setSubmitting(true);
    setFailure("");
    try {
      await signIn(form.email.trim(), form.password);
      const result = await getCurrentUser();
      setUser(result);
      setIsLogged(true);

      showToast("Welcome back! Successfully logged in");
      router.replace("/home");
    } catch (error) {
      setFailure(signInFailure(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to see your pianos and rentals."
      busy={working}
      onBack={() => (router.canGoBack?.() ? router.back() : router.replace("/"))}
      footer={
        <AuthSwitch
          question="New to Pianoverse?"
          action="Create account"
          onPress={() => router.push("/sign-up")}
        />
      }
    >
      {failure ? <AuthError message={failure} /> : null}

      <View style={failure ? styles.fieldsAfterError : styles.fields}>
        <Field
          ref={fields.email}
          label="Email"
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
        />
        <Field
          ref={fields.password}
          label="Password"
          value={form.password}
          onChangeText={change("password")}
          onBlur={leave("password")}
          error={errors.password}
          disabled={working}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          style={styles.next}
        />
      </View>

      {isSubmitting ? (
        // The link is gone while signing in, but its room stays so nothing moves
        <View style={styles.forgotRoom} />
      ) : (
        <View style={styles.forgot}>
          <Pressable
            onPress={() => router.push("/forget-password")}
            accessibilityRole="link"
            accessibilityLabel="Forgot password?"
            style={styles.forgotPress}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </View>
      )}

      <Button
        title="Sign in"
        loading={isSubmitting}
        loadingTitle="Signing in"
        disabled={google.busy}
        onPress={submit}
        style={styles.button}
      />

      <AuthDivider />
      <GoogleButton onPress={google.start} loading={google.busy} disabled={isSubmitting} />
    </AuthScreen>
  );
};

const useStyles = makeStyles((colors) => ({
  fields: { marginTop: spacing.xxxl },
  fieldsAfterError: { marginTop: spacing.xl },
  next: { marginTop: spacing.md },
  forgot: { alignItems: "flex-end", marginTop: spacing.xs },
  forgotRoom: { height: 48 },
  forgotPress: { height: spacing.minTarget, justifyContent: "center" },
  forgotText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.brandText },
  button: { marginTop: spacing.md },
}));

export default SignIn;
