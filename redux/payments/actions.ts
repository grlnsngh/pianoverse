export const PAYMENTS_CHANGED = "PAYMENTS_CHANGED";

export interface PaymentsChangedAction {
  type: typeof PAYMENTS_CHANGED;
}

export type PaymentsActionTypes = PaymentsChangedAction;

/** Tells screens showing totals of rent payments that a payment was added or deleted. */
export const paymentsChanged = (): PaymentsChangedAction => ({
  type: PAYMENTS_CHANGED,
});
