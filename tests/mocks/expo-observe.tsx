import type { ReactElement, ReactNode } from "react";

// expo-observe dispatches to expo from native code. tests record the calls instead.
export const Observe = {
  configure: jest.fn(),
  markInteractive: jest.fn(),
  reportError: jest.fn(),
};

// the hook's route-scoped markInteractive is the same mock, so tests assert on
// Observe.markInteractive.
export function useObserve() {
  return { markInteractive: Observe.markInteractive };
}

type FallbackProps = { error: unknown; resetError: () => void };

export type ObserveRootProps = {
  children: ReactNode;
  errorBoundaryFallback?: ReactElement | null | ((props: FallbackProps) => ReactNode);
};

// renders its children and keeps its props, so a test can render the fallback it was given.
export const ObserveRoot = jest.fn(({ children }: ObserveRootProps) => children);
