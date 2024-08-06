import { View, Text, Image } from "react-native";
import React from "react";
import { images } from "@/constants";

const Logo = () => {
  return (
    <View className="flex-row align-center gap-2">
      <Image
        source={images.piano}
        className="w-10 h-10"
        resizeMode="contain"
        tintColor="#FFA001"
      />
      <Text className="text-5xl text-white font-bold text-center">
        Piano
        <Text className="text-secondary-200">verse</Text>
      </Text>
    </View>
  );
};

export default Logo;
