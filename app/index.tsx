import { images } from "@/constants";
import { SECONDARY_COLOR, PRIMARY_COLOR } from "@/constants/colors";
import { useGlobalContext } from "@/context/GlobalProvider";
import { Image } from "expo-image";
import { Redirect, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Text,
  View,
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useRef } from "react";
import CustomButton from "./components/CustomButton";
import Logo from "./components/Logo";

const { width, height } = Dimensions.get("window");

export default function Index() {
  const { loading, isLogged } = useGlobalContext();

  // Animation refs
  const logoAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(30)).current;
  const subtitleAnim = useRef(new Animated.Value(30)).current;
  const imageAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(30)).current;
  const decorAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!loading && !isLogged) {
      // Start animations when component mounts
      Animated.sequence([
        Animated.timing(logoAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(imageAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(titleAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(subtitleAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(buttonAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Start decorative animation loop
      const decorAnimation = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(decorAnim, {
              toValue: 1.05,
              duration: 4000,
              useNativeDriver: true,
            }),
            Animated.timing(decorAnim, {
              toValue: 1,
              duration: 4000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };

      decorAnimation();
    }
  }, [loading, isLogged]);

  if (!loading && isLogged) return <Redirect href="/home" />;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.loadingLogo,
              {
                opacity: logoAnim,
                transform: [
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
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Background decorative elements */}
      <Animated.View
        style={[styles.backgroundDecor, { transform: [{ scale: decorAnim }] }]}
      >
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
        <View style={[styles.decorCircle, styles.decorCircle3]} />
        <View style={[styles.decorCircle, styles.decorCircle4]} />
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
                    outputRange: [-20, 0],
                  }),
                },
                {
                  scale: logoAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Logo />
        </Animated.View>

        {/* Animated Hero Image */}
        <Animated.View
          style={[
            styles.imageContainer,
            {
              opacity: imageAnim,
              transform: [
                {
                  translateY: imageAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
                {
                  scale: imageAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Image
            source={images.cards}
            style={styles.heroImage}
            contentFit="contain"
          />
        </Animated.View>

        {/* Animated Title Section */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              transform: [{ translateY: titleAnim }],
              opacity: logoAnim,
            },
          ]}
        >
          <Text style={styles.mainTitle}>
            Seamless Management{"\n"}
            with <Text style={styles.brandText}>PianoVerse</Text>
          </Text>

          <Image
            source={images.path}
            style={styles.pathImage}
            contentFit="contain"
          />
        </Animated.View>

        {/* Animated Subtitle */}
        <Animated.View
          style={[
            styles.subtitleContainer,
            {
              transform: [{ translateY: subtitleAnim }],
              opacity: logoAnim,
            },
          ]}
        >
          <Text style={styles.subtitle}>
            Discover the Harmony of Efficiency: Manage Your Piano Inventory
            Seamlessly with PianoVerse
          </Text>
        </Animated.View>

        {/* Animated Button */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              transform: [{ translateY: buttonAnim }],
              opacity: logoAnim,
            },
          ]}
        >
          <CustomButton
            title="Get Started"
            handlePress={() => router.push("/sign-in")}
            containerStyles="w-full"
          />

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/sign-up")}
          >
            <Text style={styles.secondaryButtonText}>
              Don't have an account?{" "}
              <Text style={styles.linkText}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
      <StatusBar backgroundColor={PRIMARY_COLOR} style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingLogo: {
    alignItems: "center",
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
    opacity: 0.08,
  },
  decorCircle1: {
    width: 200,
    height: 200,
    backgroundColor: SECONDARY_COLOR,
    top: -100,
    right: -100,
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
    top: height * 0.3,
    right: -50,
  },
  decorCircle4: {
    width: 60,
    height: 60,
    backgroundColor: SECONDARY_COLOR,
    bottom: 80,
    left: width * 0.15,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    justifyContent: "space-between",
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  imageContainer: {
    alignItems: "center",
    flex: 0.6,
    justifyContent: "center",
  },
  heroImage: {
    width: Math.min(width * 0.7, 320),
    height: 240,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 10,
    position: "relative",
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  brandText: {
    color: SECONDARY_COLOR,
    fontWeight: "800",
  },
  pathImage: {
    width: 120,
    height: 10,
    position: "absolute",
    bottom: -6,
    right: 15,
  },
  subtitleContainer: {
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#A1A1AA",
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "400",
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryButton: {
    marginTop: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: "#A1A1AA",
    fontSize: 15,
    textAlign: "center",
  },
  linkText: {
    color: SECONDARY_COLOR,
    fontWeight: "600",
  },
});
