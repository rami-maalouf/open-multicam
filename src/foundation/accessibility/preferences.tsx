import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { AccessibilityInfo } from "react-native";

export type AccessibilityPreferences = {
  increaseContrast: boolean;
  reduceMotion: boolean;
  reduceTransparency: boolean;
};

export const defaultAccessibilityPreferences: AccessibilityPreferences = {
  increaseContrast: false,
  reduceMotion: false,
  reduceTransparency: false,
};

const AccessibilityPreferencesContext = createContext(
  defaultAccessibilityPreferences,
);

function useObservedAccessibilityPreferences(): AccessibilityPreferences {
  const [preferences, setPreferences] = useState(
    defaultAccessibilityPreferences,
  );

  useEffect(() => {
    let isMounted = true;

    void Promise.all([
      AccessibilityInfo.isDarkerSystemColorsEnabled().catch(() => false),
      AccessibilityInfo.isReduceMotionEnabled().catch(() => false),
      AccessibilityInfo.isReduceTransparencyEnabled().catch(() => false),
    ]).then(([increaseContrast, reduceMotion, reduceTransparency]) => {
      if (isMounted) {
        setPreferences({
          increaseContrast,
          reduceMotion,
          reduceTransparency,
        });
      }
    });

    const subscriptions = [
      AccessibilityInfo.addEventListener(
        "darkerSystemColorsChanged",
        (increaseContrast) => {
          setPreferences((current) => ({ ...current, increaseContrast }));
        },
      ),
      AccessibilityInfo.addEventListener("reduceMotionChanged", (reduceMotion) => {
        setPreferences((current) => ({ ...current, reduceMotion }));
      }),
      AccessibilityInfo.addEventListener(
        "reduceTransparencyChanged",
        (reduceTransparency) => {
          setPreferences((current) => ({ ...current, reduceTransparency }));
        },
      ),
    ];

    return () => {
      isMounted = false;
      for (const subscription of subscriptions) {
        subscription.remove();
      }
    };
  }, []);

  return preferences;
}

function ObservedAccessibilityPreferencesProvider({
  children,
}: PropsWithChildren) {
  const preferences = useObservedAccessibilityPreferences();

  return (
    <AccessibilityPreferencesContext.Provider value={preferences}>
      {children}
    </AccessibilityPreferencesContext.Provider>
  );
}

export type AccessibilityPreferencesProviderProps = PropsWithChildren<{
  value?: AccessibilityPreferences;
}>;

export function AccessibilityPreferencesProvider({
  children,
  value,
}: AccessibilityPreferencesProviderProps) {
  if (value !== undefined) {
    return (
      <AccessibilityPreferencesContext.Provider value={value}>
        {children}
      </AccessibilityPreferencesContext.Provider>
    );
  }

  return (
    <ObservedAccessibilityPreferencesProvider>
      {children}
    </ObservedAccessibilityPreferencesProvider>
  );
}

export function useAccessibilityPreferences(): AccessibilityPreferences {
  return useContext(AccessibilityPreferencesContext);
}
