import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Dimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from "react-native";

interface PhotoGalleryProps {
  // The URLs of the photos, the cover first
  photos: string[];
  height: number;
}

// The screens keep 16 points of padding on each side
const SCREEN_PADDING = 32;

/**
 * A piano's photos: one photo is shown as it is, several can be swiped
 * through, with a counter such as "2 / 5".
 */
const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, height }) => {
  const [width, setWidth] = useState(
    Dimensions.get("window").width - SCREEN_PADDING
  );
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return <View className="w-full rounded-2xl bg-black-100" style={{ height }} />;
  }

  if (photos.length === 1) {
    return (
      <Image
        source={{ uri: photos[0] }}
        style={{ height }}
        className="w-full rounded-2xl"
        resizeMode="cover"
      />
    );
  }

  const handleLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) {
      setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
    }
  };

  return (
    <View
      onLayout={handleLayout}
      className="w-full rounded-2xl overflow-hidden"
      style={{ height }}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {photos.map((uri, position) => (
          <Image
            key={`${position}-${uri}`}
            source={{ uri }}
            style={{ width, height }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
      <View className="absolute bottom-3 right-3 bg-black/60 rounded-full px-3 py-1">
        <Text className="text-white font-pmedium text-xs">
          {index + 1} / {photos.length}
        </Text>
      </View>
    </View>
  );
};

export default PhotoGallery;
