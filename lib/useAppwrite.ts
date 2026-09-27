import { useCallback, useState, useEffect, useRef } from "react";
import { Alert } from "react-native";

const useAppwrite = (fn: () => Promise<any>) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const hasFetchedRef = useRef(false);
  // Keep refetch stable (for memoized list rows) while still calling the
  // latest fn
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const fetchData = useCallback(async () => {
    // Prevent duplicate fetches
    if (hasFetchedRef.current) return;

    setIsLoading(true);
    try {
      const response = await fnRef.current();
      setData(response);
      setError(null);
      hasFetchedRef.current = true;
    } catch (error) {
      setError(error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "An error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const refetch = useCallback(() => {
    hasFetchedRef.current = false;
    return fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch };
};

export default useAppwrite;
