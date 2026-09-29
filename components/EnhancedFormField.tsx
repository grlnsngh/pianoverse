import React, { useState, useRef, useEffect } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { icons } from "@/constants";
import { SECONDARY_COLOR } from "@/constants/colors";

interface EnhancedFormFieldProps {
  title: string;
  value: string;
  handleChangeText: (text: string) => void;
  placeholder?: string;
  otherStyles?: string;
  error?: string;
  [key: string]: any;
}

const EnhancedFormField: React.FC<EnhancedFormFieldProps> = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles = "",
  error,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPassword = title.toLowerCase().includes("password");

  const animatedValue = useRef(new Animated.Value(0)).current;
  const borderAnimatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

    Animated.timing(borderAnimatedValue, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    position: "absolute" as const,
    left: 16,
    top: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [18, 8],
    }),
    fontSize: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ["#A1A1AA", isFocused ? SECONDARY_COLOR : "#E5E7EB"],
    }),
    zIndex: 1,
  };

  const borderColor = borderAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255, 255, 255, 0.2)", SECONDARY_COLOR],
  });

  return (
    <View style={[styles.container, otherStyles ? { marginTop: 16 } : null]}>
      <View style={styles.inputContainer}>
        <Animated.View
          style={[
            styles.inputWrapper,
            {
              borderColor: error ? "#EF4444" : borderColor,
            },
          ]}
        >
          <Animated.Text style={labelStyle}>{title}</Animated.Text>

          <TextInput
            style={[
              styles.textInput,
              { paddingTop: isFocused || value ? 24 : 20 },
            ]}
            value={value}
            placeholder={isFocused ? "" : placeholder}
            placeholderTextColor="#A1A1AA"
            onChangeText={handleChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            secureTextEntry={isPassword && !showPassword}
            {...props}
          />

          {isPassword && (
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Image
                source={!showPassword ? icons.eye : icons.eyeHide}
                style={styles.eyeIcon}
                contentFit="contain"
                tintColor={isFocused ? SECONDARY_COLOR : "#A1A1AA"}
              />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  inputContainer: {
    position: "relative",
  },
  inputWrapper: {
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    paddingRight: 40, // Space for eye icon
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 18,
    padding: 4,
  },
  eyeIcon: {
    width: 20,
    height: 20,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default EnhancedFormField;
