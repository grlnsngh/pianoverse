export const SET_CURRENT_USER = "SET_CURRENT_USER";

export const setCurrentUser = (res: string | null) => ({
  type: SET_CURRENT_USER,
  payload: res,
});
