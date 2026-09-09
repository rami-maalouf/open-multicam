export type TipJarStatus = Readonly<{
  available: boolean;
  displayPrice?: string;
  hasSupported: boolean;
}>;

export type TipPurchaseResult = "purchased" | "cancelled" | "pending";

export type TipJarModuleEvents = {
  onChange: () => void;
};
