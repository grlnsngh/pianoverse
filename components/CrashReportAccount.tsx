import { useEffect } from "react";
import { useSelector } from "react-redux";
import { setCrashReportAccount } from "@/lib/crashReports";
import type { RootState } from "@/redux/store";

/**
 * Keeps the signed-in account's ID on crash reports (lib/crashReports.ts),
 * so a report can be matched to whoever had the problem, and takes it off at
 * sign out. It draws nothing.
 */
const CrashReportAccount = () => {
  const accountId = useSelector((state: RootState) => state.users.user?.accountId ?? null);
  useEffect(() => {
    setCrashReportAccount(accountId);
  }, [accountId]);
  return null;
};

export default CrashReportAccount;
