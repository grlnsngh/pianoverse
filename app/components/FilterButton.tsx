import { View, Text, TouchableOpacity, Image } from "react-native";
import React from "react";
import { icons } from "@/constants";

const FilterButton = () => {
  return (
    <View
      style={{ height: 60, width: 60 }}
      className="flex flex-row items-center space-x-4 
     px-4 bg-black-100 rounded-2xl
    border-2 border-black-200 focus:border-secondary
    justify-center"
    >
      <TouchableOpacity onPress={() => {}}>
        <Image
          style={{ tintColor: "white" }}
          source={icons.filter}
          className="w-6 h-6"
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
};

export default FilterButton;
