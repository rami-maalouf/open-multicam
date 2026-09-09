import { NativeModule, requireNativeModule } from "expo";

import type { TipJarModuleEvents, TipJarStatus, TipPurchaseResult } from "./TipJar.types";

declare class TipJarModule extends NativeModule<TipJarModuleEvents> {
  getStatus(): Promise<TipJarStatus>;
  purchase(): Promise<TipPurchaseResult>;
  restore(): Promise<TipJarStatus>;
}

export default requireNativeModule<TipJarModule>("TipJar");
