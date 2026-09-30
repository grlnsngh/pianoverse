import { SplashScreen, Stack } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect } from "react";
// One import per weight, so only the four weights the design uses are bundled
import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_500Medium } from "@expo-google-fonts/figtree/500Medium";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import { Figtree_700Bold } from "@expo-google-fonts/figtree/700Bold";
import GlobalProvider from "@/context/GlobalProvider";
import { Provider } from "react-redux";
import { PaperProvider } from "react-native-paper";
import store from "@/redux/store";
import DialogHost from "@/components/DialogHost";
import ToastHost from "@/components/ToastHost";
import { PianoDataProvider } from "@/lib/PianoDataContext";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    "Poppins-Black": require("../assets/fonts/Poppins-Black.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-ExtraBold": require("../assets/fonts/Poppins-ExtraBold.ttf"),
    "Poppins-ExtraLight": require("../assets/fonts/Poppins-ExtraLight.ttf"),
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Thin": require("../assets/fonts/Poppins-Thin.ttf"),
    // The redesign's font; names match `fonts` in constants/theme.ts
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  useEffect(() => {
    if (error) throw error;

    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded) {
    return null;
  }

  if (!fontsLoaded && !error) {
    return null;
  }

  return (
    <Provider store={store}>
      <GlobalProvider>
        {/* One provider for the whole app (theme and the host that menus
            render into), instead of one per list row */}
        <PaperProvider>
          <PianoDataProvider>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              {/* The Add flow: its own screen above the tabs, with its own back button */}
              <Stack.Screen name="create" options={{ headerShown: false }} />
              {/* Its third step, the review, and the Edit screen draw their own top bar */}
              <Stack.Screen name="review" options={{ headerShown: false }} />
              <Stack.Screen name="edit/[id]" options={{ headerShown: false }} />
              {/* Search draws its own field and Cancel button; /search and /search/<words> are the one screen */}
              <Stack.Screen
                name="search/index"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="search/[query]"
                options={{ headerShown: false }}
              />
              {/* A piano's page draws its own photo, Back button and bar */}
              <Stack.Screen
                name="detail/[id]"
                options={{ headerShown: false }}
              />
            </Stack>
          </PianoDataProvider>
          <ToastHost />
          <DialogHost />
        </PaperProvider>
      </GlobalProvider>
    </Provider>
  );
}
