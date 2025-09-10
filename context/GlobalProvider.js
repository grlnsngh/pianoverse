import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/appwrite";
import { useDispatch } from "react-redux";
import { setCurrentUser } from "@/redux/users/actions";
import * as Notifications from "expo-notifications";
import {
  requestNotificationPermissions,
  handleNotificationResponse,
} from "@/app/services/notifications";

const GlobalContext = createContext();
export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res) {
          setIsLogged(true);
          setUser(res);
          dispatch(setCurrentUser(res));
        } else {
          setIsLogged(false);
          setUser(null);
        }
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Initialize notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      // Request notification permissions
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        console.log("✅ Notification permissions granted");
      }

      // Set up notification listeners
      const notificationListener =
        Notifications.addNotificationReceivedListener((notification) => {
          console.log(
            "📱 Notification received:",
            notification.request.content.title
          );
        });

      const responseListener =
        Notifications.addNotificationResponseReceivedListener((response) => {
          console.log(
            "👆 User tapped notification:",
            response.notification.request.content.title
          );
          handleNotificationResponse(response);
        });

      return () => {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
      };
    };

    initializeNotifications();
  }, []);

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
