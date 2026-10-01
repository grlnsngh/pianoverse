import { Redirect } from "expo-router";
import React from "react";
import Splash from "@/components/Splash";
import WelcomeScreen from "@/components/WelcomeScreen";
import { useGlobalContext } from "@/context/GlobalProvider";

/**
 * The first screen. While the app finds out who is signed in it shows the
 * splash; then a signed-in person goes to the tabs, and anyone else sees the
 * welcome screen, with its Sign in and Create account buttons.
 */
export default function Index() {
  const { loading, isLogged } = useGlobalContext();

  if (!loading && isLogged) return <Redirect href="/home" />;
  if (loading) return <Splash />;
  return <WelcomeScreen />;
}
