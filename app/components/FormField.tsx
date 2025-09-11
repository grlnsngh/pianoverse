/* eslint-disable react/react-in-jsx-scope */
import { icons } from "@/constants";
import { Image } from "expo-image";
import React, { useState, useCallback, useMemo } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

interface FormFieldProps {
  title: string;
  value: string;
  handleChangeText: (text: string) => void;
  placeholder?: string;
  otherStyles?: string;
  [key: string]: any; // For any additional props
}

const FormField: React.FC<FormFieldProps> = React.memo(
  ({
    title,
    value,
    placeholder,
    handleChangeText,
    otherStyles = "mt-7",
    ...props
  }) => {
    const [showPassword, setShowPassword] = useState(false);

    const isDescription = useMemo(() => title === "Description", [title]);
    const inputHeight = useMemo(
      () => (isDescription ? 120 : 60),
      [isDescription]
    );
    const isPassword = useMemo(() => title === "Password", [title]);

    const togglePasswordVisibility = useCallback(() => {
      setShowPassword(!showPassword);
    }, [showPassword]);

    return (
      <View className={`space-y-2 ${otherStyles}`}>
        <Text className="text-base text-gray-100 font-pmedium">{title}</Text>

        <View
          style={{ height: inputHeight }}
          className={`w-full px-4 bg-black-100 rounded-2xl border-2 border-black-200 focus:border-secondary ${
            isDescription ? "" : "flex flex-row items-center"
          }`}
        >
          <TextInput
            className={`${
              isDescription ? "pt-4 h-32" : "flex-1"
            } text-white font-psemibold text-base`}
            value={value}
            placeholder={placeholder}
            placeholderTextColor="#7B7B8B"
            onChangeText={handleChangeText}
            secureTextEntry={isPassword && !showPassword}
            {...props}
            {...(isDescription && {
              multiline: true,
              textAlignVertical: "top",
            })}
          />

          {isPassword && (
            <TouchableOpacity onPress={togglePasswordVisibility}>
              <Image
                source={!showPassword ? icons.eye : icons.eyeHide}
                className="w-6 h-6"
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
);

export default FormField;
