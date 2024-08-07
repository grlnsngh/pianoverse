import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DetailScreen = () => {
  const { id } = useLocalSearchParams();
  return (
    <SafeAreaView className="bg-primary h-full">
      <Text className="text-3xl text-white">{id}</Text>
    </SafeAreaView>
  );
};

export default DetailScreen;
