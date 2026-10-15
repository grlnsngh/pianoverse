import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { recordFormEvent } from "@/lib/formEvents";
import type { RootState } from "@/redux/store";
import type { FormEventForm } from "@/utils/formEvents";

/**
 * Counts that a form's screen was opened (lib/formEvents.ts): once when it
 * opens, and again when it changes to another form, such as the agreement
 * switched from Hotel to Private person. Nothing when there is no form, and it
 * waits for the account if that is still being read.
 */
const useCountFormOpened = (form: FormEventForm | null) => {
  const creator = useSelector((state: RootState) => state.users.user?.accountId);
  const counted = useRef<FormEventForm | null>(null);
  useEffect(() => {
    if (!form || !creator || counted.current === form) return;
    counted.current = form;
    recordFormEvent(creator, form, "opened");
  }, [form, creator]);
};

export default useCountFormOpened;
