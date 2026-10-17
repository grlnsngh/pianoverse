import { ThemeProvider as NavigationThemeProvider, SplashScreen, Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { useEffect, useMemo } from "react";
// One import per weight, so only the four weights the design uses are bundled
import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_500Medium } from "@expo-google-fonts/figtree/500Medium";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import { Figtree_700Bold } from "@expo-google-fonts/figtree/700Bold";
import GlobalProvider from "@/context/GlobalProvider";
import { Provider } from "react-redux";
import store from "@/redux/store";
import CrashReportAccount from "@/components/CrashReportAccount";
import DialogHost from "@/components/DialogHost";
import ToastHost from "@/components/ToastHost";
import { AppLockProvider } from "@/lib/AppLockContext";
import { startCrashReports } from "@/lib/crashReports";
import { PianoDataProvider } from "@/lib/PianoDataContext";
import { ThemeProvider, useTheme } from "@/lib/ThemeContext";
import useAppUpdates from "@/lib/useAppUpdates";
import useSendFormEvents from "@/lib/useSendFormEvents";
import useSystemChrome from "@/lib/useSystemChrome";
import { navigationThemeFor } from "@/utils/navigationTheme";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Crash reports from an installed build, before anything is drawn (lib/crashReports.ts)
startCrashReports();

function RootContent() {
  // Fixes published with `eas update` reach the phone without a new build
  useAppUpdates();
  // Paper forms' usage counts made without a connection go once there is one
  useSendFormEvents();

  const { scheme, colors, ready } = useTheme();
  // The status bar and the window behind the app follow the theme too
  useSystemChrome(scheme, colors);
  const navigationTheme = useMemo(() => navigationThemeFor(scheme, colors), [scheme, colors]);

  const [fontsLoaded, error] = useFonts({
    // The redesign's font; names match `fonts` in constants/theme.ts
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  useEffect(() => {
    if (error) throw error;

    // The saved theme is read too, so the first frame isn't the wrong colour
    if (fontsLoaded && ready) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, ready, error]);

  if (!fontsLoaded || !ready) {
    return null;
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      {/* Swipeable rows need this around everything */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <CrashReportAccount />
          <GlobalProvider>
            {/* Asks for a fingerprint or screen lock first, when the person turned that on */}
            <AppLockProvider>
              <PianoDataProvider>
                <Stack>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  {/* The Add flow: its own screen above the tabs, with its own back button */}
                  <Stack.Screen name="create" options={{ headerShown: false }} />
                  {/* The Income screen, opened from Today, draws its own back button */}
                  <Stack.Screen name="income" options={{ headerShown: false }} />
                  {/* Everything that cost money, from the Income screen */}
                  <Stack.Screen name="expenses" options={{ headerShown: false }} />
                  {/* Which pianos are free on a day, from the calendar button on the Pianos tab */}
                  <Stack.Screen name="availability" options={{ headerShown: false }} />
                  {/* Deposits held for the rentals on the pianos, from the Income screen */}
                  <Stack.Screen name="deposits" options={{ headerShown: false }} />
                  {/* Scan a label on a piano, from the Pianos tab (a camera screen with its own close button) */}
                  <Stack.Screen name="scan" options={{ headerShown: false, animation: "fade" }} />
                  {/* The customers, opened from Account or a piano's Previous renters, draw their own back button */}
                  <Stack.Screen name="customers" options={{ headerShown: false }} />
                  <Stack.Screen name="customer/[key]" options={{ headerShown: false }} />
                  {/* Paper forms and each form's screen, opened from Account, draw their own back button */}
                  <Stack.Screen name="paper-forms" options={{ headerShown: false }} />
                  <Stack.Screen name="paper-form/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="paper-agreement" options={{ headerShown: false }} />
                  {/* The letterhead the paper forms are printed on, and its screens */}
                  <Stack.Screen name="letterhead" options={{ headerShown: false }} />
                  <Stack.Screen name="letterhead-details" options={{ headerShown: false }} />
                  <Stack.Screen name="letterhead-upload" options={{ headerShown: false }} />
                  <Stack.Screen name="letterhead-printed" options={{ headerShown: false }} />
                  {/* A piano's whole tuning and service log, from Show all on its page */}
                  <Stack.Screen name="service/[id]" options={{ headerShown: false }} />
                  {/* Edit profile, opened from Account, draws its own back button */}
                  <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
                  {/* Its third step, the review, and the Edit screen draw their own top bar */}
                  <Stack.Screen name="review" options={{ headerShown: false }} />
                  <Stack.Screen name="edit/[id]" options={{ headerShown: false }} />
                  {/* Search draws its own field and Cancel button; /search and /search/<words> are the one screen */}
                  <Stack.Screen name="search/index" options={{ headerShown: false }} />
                  <Stack.Screen name="search/[query]" options={{ headerShown: false }} />
                  {/* A piano's page draws its own photo, Back button and bar, and
                      fades in (and grows a little, in the page) instead of sliding,
                      as the card-to-hero fallback of SPEC 7 */}
                  <Stack.Screen
                    name="detail/[id]"
                    options={{ headerShown: false, animation: "fade" }}
                  />
                </Stack>
              </PianoDataProvider>
            </AppLockProvider>
            <ToastHost />
            <DialogHost />
          </GlobalProvider>
        </Provider>
      </GestureHandlerRootView>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootContent />
    </ThemeProvider>
  );
}
