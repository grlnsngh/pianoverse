import { View, Text, ScrollView } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

const Bookmark = () => {
  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full flex  min-h-[90vh] px-4 my-6">
          <Text className="text-2xl text-white font-psemibold">Bookmark</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Bookmark;
