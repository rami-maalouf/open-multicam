// behavior-focused test double for @expo/ui. The real package renders through
// SwiftUI hosts, whose children are not touch responders under the test
// renderer, so presses inside a BottomSheet never reach their handler. These
// stand-ins keep the same contract while staying plain React Native views.
import { type ReactNode } from "react";
import { Switch as RNSwitch, View } from "react-native";

type HostProps = Readonly<{
  children?: ReactNode;
  matchContents?: boolean;
  seedColor?: string;
}>;

export function Host({ children }: HostProps) {
  return <View>{children}</View>;
}

type ColumnProps = Readonly<{
  children?: ReactNode;
  spacing?: number;
}>;

export function Column({ children, spacing }: ColumnProps) {
  return <View style={{ gap: spacing }}>{children}</View>;
}

type SwitchProps = Readonly<{
  value: boolean;
  label?: string;
  onValueChange?: (value: boolean) => void;
  testID?: string;
}>;

export function Switch({ value, label, onValueChange, testID }: SwitchProps) {
  return (
    <RNSwitch
      accessibilityLabel={label}
      onValueChange={onValueChange}
      testID={testID}
      value={value}
    />
  );
}

type BottomSheetProps = Readonly<{
  children?: ReactNode;
  isPresented: boolean;
  onDismiss: () => void;
  testID?: string;
}>;

export function BottomSheet({
  children,
  isPresented,
  testID,
}: BottomSheetProps) {
  // the real sheet keeps its content mounted off screen; the double drops it
  // so queries cannot match a sheet the viewer has not opened
  if (!isPresented) {
    return null;
  }
  return <View testID={testID}>{children}</View>;
}
