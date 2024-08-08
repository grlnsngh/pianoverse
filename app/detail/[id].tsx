import { PianoItem } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import { printCategoryLabel } from "@/utils/ObjectManipulation";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { PIANO_CATEGORY } from "../constants/Piano";

const DetailScreen = () => {
  const { id } = useLocalSearchParams();
  const pianosList = useSelector((state: RootState) => state.pianos.items);

  const filteredPiano: PianoItem | undefined = pianosList.find(
    (piano) => piano.$id === id
  );

  const { title, image_url, category, make, creator } = filteredPiano || {};

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full flex min-h-[90vh] px-4 space-y-6">
          <Image
            source={{ uri: image_url }}
            className="w-max h-64 rounded-xl"
            resizeMode="cover"
          />
          <Text className="text-3xl text-white">{title}</Text>
          <Text className="text-lg text-white">
            {printCategoryLabel(category)}
          </Text>
          <Text className="text-lg text-white">{make}</Text>
          <Text className="text-lg text-white">{creator}</Text>

          {category === PIANO_CATEGORY.RENTABLE && (
            <Text className="text-lg text-white">hi</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DetailScreen;
