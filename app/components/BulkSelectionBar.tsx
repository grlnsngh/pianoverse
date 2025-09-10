import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { icons } from "@/constants";
import { SECONDARY_COLOR } from "@/constants/colors";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

interface BulkSelectionBarProps {
  isVisible: boolean;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDone: () => void;
}

const BulkSelectionBar: React.FC<BulkSelectionBarProps> = ({
  isVisible,
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDone,
}) => {
  const translateY = useSharedValue(100);

  React.useEffect(() => {
    translateY.value = withTiming(isVisible ? 0 : 100, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      className="absolute bottom-0 left-0 right-0 bg-primary-100 border-t border-primary-200"
    >
      <View className="flex-row items-center justify-between px-6 py-4">
        {/* Selection Info */}
        <View className="flex-row items-center">
          <Text className="text-white font-psemibold text-base mr-2">
            {selectedCount} selected
          </Text>
          <Text className="text-gray-300 font-pregular text-sm">
            of {totalCount}
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center space-x-4">
          <TouchableOpacity
            onPress={
              selectedCount === totalCount ? onClearSelection : onSelectAll
            }
            className="flex-row items-center px-3 py-2 rounded-lg bg-primary-200"
            activeOpacity={0.7}
          >
            <Image
              source={
                selectedCount === totalCount ? icons.close : icons.bookmark
              }
              className="w-4 h-4 mr-2"
              tintColor="#CDCDE0"
              resizeMode="contain"
            />
            <Text className="text-gray-200 font-pmedium text-sm">
              {selectedCount === totalCount ? "Clear" : "All"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onDone}
            className="px-4 py-2 rounded-lg bg-secondary"
            activeOpacity={0.7}
          >
            <Text className="text-primary font-psemibold text-sm">Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default BulkSelectionBar;
