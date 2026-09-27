import { images } from "@/constants";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { useDispatch } from "react-redux";
import { setActiveTab } from "@/redux/navigation/actions";
import CustomButton from "./CustomButton";

interface EmptyStateProps {
  title: string;
  subtitle: string;
  // Replaces the default "Back to Explore" button
  action?: { title: string; onPress: () => void };
}

const EmptyState: React.FC<EmptyStateProps> = React.memo(
  ({ title, subtitle, action }) => {
    const dispatch = useDispatch();
    const pathname = usePathname();

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
        <Text className="text-sm text-center font-pmedium text-gray-100">
          {subtitle}
        </Text>

        <CustomButton
          title={action?.title ?? "Back to Explore"}
          handlePress={
            action?.onPress ??
            (() => {
              dispatch(setActiveTab("home") as any);
              // From search results, return to the list
              if (pathname.startsWith("/search")) router.back();
            })
          }
          containerStyles="w-full my-5"
        />
      </View>
    );
  }
);

export default EmptyState;
