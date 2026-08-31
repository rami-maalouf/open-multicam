import { Redirect } from "expo-router";

import { FoundationPreviewScreen } from "@/screens/settings/foundation-preview-screen";

export default function DevFoundationRoute() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return <FoundationPreviewScreen />;
}
