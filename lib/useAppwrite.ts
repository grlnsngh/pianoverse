import { useState, useEffect, useRef } from "react";
import { Alert } from "react-native";

const useAppwrite = (fn: () => Promise<any>) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  const fetchData = async () => {
    // Prevent duplicate fetches
    if (hasFetchedRef.current) return;

    setIsLoading(true);
    try {
      const response = await fn();
      setData(response);
      hasFetchedRef.current = true;
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "An error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refetch = () => {
    hasFetchedRef.current = false;
    fetchData();
  };

  return { data, isLoading, refetch };
};

export default useAppwrite;
