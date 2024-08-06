import { Link, Redirect, router } from "expo-router";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "./components/Logo";
import { images } from "@/constants";
import { StatusBar } from "expo-status-bar";
import CustomButton from "./components/CustomButton";
import { useGlobalContext } from "@/context/GlobalProvider";

export default function Index() {
  const { loading, isLogged } = useGlobalContext();
  if (!loading && isLogged) return <Redirect href="/home" />;

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView
        contentContainerStyle={{
          height: "100%",
        }}
      >
        <View className="w-full flex justify-center items-center h-full px-4">
          <Logo />

          <Image
            source={images.cards}
            className="max-w-[380px] w-full h-[298px]"
            resizeMode="contain"
          />

          <View className="relative mt-5">
            <Text className="text-3xl text-white font-bold text-center">
              Seemless management{"\n"}
              with Piano
              <Text className="text-secondary-200">verse</Text>
            </Text>

            <Image
              source={images.path}
              className="w-[136px] h-[12px] absolute -bottom-2 -right-0"
              resizeMode="contain"
            />
          </View>

          <Text className="text-sm font-pregular text-gray-100 mt-7 text-center">
            Discover the Harmony of Efficiency: Manage Your Piano Inventory
            Seamlessly with Pianoverse
          </Text>

          <CustomButton
            title="Continue with Email"
            // handlePress={() => router.push("/home")}
            handlePress={() => router.push("/sign-in")}
            containerStyles="w-full mt-7"
          />
        </View>
      </ScrollView>
      <StatusBar backgroundColor="#161622" style="light" />
    </SafeAreaView>
  );
}
