import React, { useState } from "react";
import { icons } from "@/constants";
import PropTypes from "prop-types";
import {
  Image,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";

const ListCard = ({ item }) => {
  const { title = "", image_url = "", users = {} } = item;
  const { username = "", avatar = "" } = users;

  const handleOnClickItem = () => {
    ToastAndroid.show(`Item clicked: ${title}`, ToastAndroid.SHORT);
  };

  return (
    <View className="flex-col items-center px-4 mb-14">
      <View className="flex-row gap-3 items-start">
        <View className="justify-center items-center flex-row flex-1">
          <View
            className="w-[46px] h-[46px] rounded-lg 
           justify-center items-center p-0.5"
          >
            <Image
              source={{ uri: avatar }}
              className="w-full h-full rounded-lg"
              resizeMode="cover"
            />
          </View>
          <View className="justify-center flex-1 ml-3 gap-y-1">
            <Text
              className="text-white font-psemibold text-sm"
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              className="text-xs text-gray-100 font-pregular"
              numberOfLines={1}
            >
              {username}
            </Text>
          </View>
        </View>
        <View className="pt-2">
          <Image source={icons.menu} className="w-5 h-5" resizeMode="contain" />
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleOnClickItem}
        className="w-full h-60 rounded-xl mt-3 relative 
        justify-center items-center"
      >
        <Image
          source={{ uri: image_url }}
          className="w-full h-full rounded-xl mt-3"
          resizeMode="cover"
        />
      </TouchableOpacity>
    </View>
  );
};

ListCard.propTypes = {
  item: PropTypes.shape({
    title: PropTypes.string.isRequired,
    image_url: PropTypes.string.isRequired,
    users: PropTypes.shape({
      username: PropTypes.string.isRequired,
      avatar: PropTypes.string.isRequired,
    }),
  }).isRequired,
};

export default ListCard;
