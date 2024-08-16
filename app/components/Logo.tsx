import { images } from "@/constants";
import { SECONDARY_COLOR } from "@/constants/colors";
import { Image } from "expo-image";
import React from "react";
import { Text, View } from "react-native";

const Logo = () => {
  return (
    <View className="flex-row align-center gap-2">
      <Image
        source={images.piano}
        className="w-10 h-10"
        resizeMode="contain"
        tintColor={SECONDARY_COLOR}
      />
      <Text className="text-5xl text-white font-bold text-center">
        Piano
        <Text className="text-secondary-200">verse</Text>
      </Text>
    </View>
  );
};

export default Logo;
