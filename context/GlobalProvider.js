import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getCurrentUser } from "@/lib/appwrite";
import { useDispatch } from "react-redux";
import { setCurrentUser } from "@/redux/users/actions";
import * as Notifications from "expo-notifications";
import {
  requestNotificationPermissions,
  handleNotificationResponse,
} from "@/services/notifications";

const GlobalContext = createContext();
export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  // Screens such as Edit read the user from Redux, so keep it in sync on
  // sign-in, sign-up and logout, not only when the app starts.
  const setUser = useCallback(
    (nextUser) => {
      setUserState(nextUser);
      dispatch(setCurrentUser(nextUser));
    },
    [dispatch]
  );

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res) {
          setIsLogged(true);
          setUser(res);
        } else {
          setIsLogged(false);
          setUser(null);
        }
      })
      .catch((error) => {
        console.warn("Could not check who is signed in:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Open the piano from a tapped reminder, once someone is signed in
  const isSignedInRef = useRef(false);
  isSignedInRef.current = isLogged && !loading;
  const pendingResponseRef = useRef(null);
  const lastHandledResponseRef = useRef(null);

  const openFromNotification = useCallback((response) => {
    const id = response.notification.request.identifier;
    if (lastHandledResponseRef.current === id) return;
    if (!isSignedInRef.current) {
      pendingResponseRef.current = response;
      return;
    }
    lastHandledResponseRef.current = id;
    handleNotificationResponse(response);
  }, []);

  useEffect(() => {
    if (loading || !isLogged || !pendingResponseRef.current) return;
    const response = pendingResponseRef.current;
    pendingResponseRef.current = null;
    openFromNotification(response);
  }, [loading, isLogged, openFromNotification]);

  // Ask for permission to send reminders, and open the piano when one is tapped
  useEffect(() => {
    requestNotificationPermissions();

    const responseListener =
      Notifications.addNotificationResponseReceivedListener(
        openFromNotification
      );

    // The app may have been opened by tapping a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openFromNotification(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [openFromNotification]);

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        setIsLogged,
        user,
        setUser,
        loading,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
