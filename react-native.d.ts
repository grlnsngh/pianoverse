import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  // Add other components if needed
}
