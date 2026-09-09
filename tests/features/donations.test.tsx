import { fireEvent } from "@testing-library/react-native";

import tipJar from "../../modules/tip-jar";
import { SupportScreen } from "@/screens/settings/support-screen";
import { PrivacyScreen } from "@/screens/settings/privacy-screen";
import { act, render, waitFor } from "@/testing/render";

jest.mock("../../modules/tip-jar", () => ({
  __esModule: true,
  default: { getStatus: jest.fn(), purchase: jest.fn(), restore: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

jest.mock("@expo/ui", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  return {
    Host: View,
    Column: View,
    Button: ({ label, disabled, onPress, testID }: { label: string; disabled: boolean; onPress: () => void; testID: string }) =>
      React.createElement(Pressable, { onPress: disabled ? undefined : onPress, accessibilityRole: "button", accessibilityState: { disabled }, testID }, React.createElement(Text, {}, label)),
  };
});

jest.mock("expo-router", () => ({ Link: require("react-native").View }));

const store = jest.mocked(tipJar);
const available = { available: true, displayPrice: "$1.99", hasSupported: false };

beforeEach(() => {
  jest.clearAllMocks();
  store.getStatus.mockResolvedValue(available);
  store.purchase.mockResolvedValue("purchased");
  store.restore.mockResolvedValue({ ...available, hasSupported: true });
});

it("shows the actual store price and acknowledges a successful optional donation", async () => {
  const screen = render(<SupportScreen />);
  await screen.findByText("Donate $1.99");
  fireEvent.press(screen.getByTestId("donate-button"));
  await screen.findByText("Thank you for your support");
  expect(store.purchase).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("donate-button")).toBeNull();
});

it("does not charge or display an invented price when the product is unavailable", async () => {
  store.getStatus.mockResolvedValueOnce({ available: false, hasSupported: false });
  const screen = render(<SupportScreen />);
  await screen.findByText("Retry App Store");
  fireEvent.press(screen.getByTestId("donate-button"));
  await screen.findByText("Donate $1.99");
  expect(store.purchase).not.toHaveBeenCalled();
});

it("handles offline product loading and recovery", async () => {
  store.getStatus.mockRejectedValueOnce(new Error("offline"));
  const screen = render(<SupportScreen />);
  await screen.findByText(/Couldn't connect to the App Store/);
  fireEvent.press(screen.getByTestId("donate-button"));
  await screen.findByText("Donate $1.99");
});

it.each(["cancelled", "pending"] as const)("does not mark a %s purchase as paid", async (result) => {
  store.purchase.mockResolvedValue(result);
  const screen = render(<SupportScreen />);
  await screen.findByText("Donate $1.99");
  fireEvent.press(screen.getByTestId("donate-button"));
  await screen.findByText("Donate $1.99");
  expect(screen.queryByText("Thank you for your support")).toBeNull();
  if (result === "pending") expect(screen.getByText(/awaiting approval/)).toBeTruthy();
});

it("restores an existing non-consumable donation", async () => {
  const screen = render(<SupportScreen />);
  await screen.findByText("Donate $1.99");
  fireEvent.press(screen.getByTestId("restore-donation-button"));
  await screen.findByText("Thank you for your support");
  expect(store.restore).toHaveBeenCalledTimes(1);
});

it("explains an empty restore without marking the user as a supporter", async () => {
  store.restore.mockResolvedValue(available);
  const screen = render(<SupportScreen />);
  await screen.findByText("Donate $1.99");
  fireEvent.press(screen.getByTestId("restore-donation-button"));
  await screen.findByText(/No previous donation/);
});

it("handles purchase errors and prevents overlapping requests", async () => {
  let rejectPurchase: (error: Error) => void = () => {};
  store.purchase.mockImplementation(() => new Promise((_resolve, reject) => { rejectPurchase = reject; }));
  const screen = render(<SupportScreen />);
  await screen.findByText("Donate $1.99");
  fireEvent.press(screen.getByTestId("donate-button"));
  fireEvent.press(screen.getByTestId("restore-donation-button"));
  expect(store.restore).not.toHaveBeenCalled();
  await act(async () => { rejectPurchase(new Error("failed")); });
  await screen.findByText(/couldn't complete this request/);
});

it("refreshes a purchase completed outside the screen and removes its observer", async () => {
  const remove = jest.fn();
  store.addListener.mockReturnValueOnce({ remove });
  const screen = render(<SupportScreen />);
  await screen.findByText("Donate $1.99");
  store.getStatus.mockResolvedValue({ ...available, hasSupported: true });
  await act(async () => { store.addListener.mock.calls.at(-1)?.[1](); });
  await screen.findByText("Thank you for your support");
  screen.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

it("renders the privacy policy offline", async () => {
  const screen = render(<PrivacyScreen />);
  await waitFor(() => expect(screen.getByText("Your recordings stay with you")).toBeTruthy());
  expect(screen.getByText("Optional donations")).toBeTruthy();
  expect(screen.getByText("Contact support")).toBeTruthy();
});
