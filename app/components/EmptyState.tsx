import { router } from "expo-router";
import { View, Text, Image } from "react-native";

import { images } from "@/constants";
import CustomButton from "./CustomButton";

interface EmptyStateProps {
  title: string;
  subtitle: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, subtitle }) => {
  return (
    <View className="flex justify-center items-center px-4">
      <Image
        source={images.empty}
        resizeMode="contain"
        className="w-[270px] h-[216px]"
      />

      <Text className="text-xl text-center font-psemibold text-white mt-2">
        {title}
      </Text>
      <Text className="text-sm font-pmedium text-gray-100">{subtitle}</Text>

      <CustomButton
        title="Back to Explore"
        handlePress={() => router.push("/home")}
        containerStyles="w-full my-5"
      />
    </View>
  );
};

export default EmptyState;
