import { Stack } from "expo-router";
import React from "react";

// Each screen draws its own back button, so none has a header
const AuthLayout = () => (
  <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="sign-in" />
    <Stack.Screen name="sign-up" />
    <Stack.Screen name="forget-password" />
    <Stack.Screen name="reset-password" />
  </Stack>
);

export default AuthLayout;
