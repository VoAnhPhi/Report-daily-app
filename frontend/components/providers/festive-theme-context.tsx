'use client';

import {
  DEFAULT_FESTIVE_THEME,
  FESTIVE_EFFECTS_LOCAL_STORAGE_KEY,
  FESTIVE_SEASON_ROLLOUT_ID,
  FESTIVE_SEASON_ROLLOUT_LOCAL_STORAGE_KEY,
  FESTIVE_THEME_LOCAL_STORAGE_KEY,
  FestiveTheme,
  getThemeConfig,
} from '@/lib/festive-theme-constants';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

interface FestiveThemeContextType {
  theme: FestiveTheme;
  setTheme: (theme: FestiveTheme) => void;
  config: ReturnType<typeof getThemeConfig>;
  /** Hiệu ứng rơi (lá / cánh hoa / tuyết) đang bật hay tắt */
  effectsEnabled: boolean;
  setEffectsEnabled: (enabled: boolean) => void;
  /** Bật/tắt ảnh nền phong cảnh/lễ hội */
  bgPhotoEnabled: boolean;
  setBgPhotoEnabled: (enabled: boolean) => void;
}

// Máy yếu hoặc người dùng đã chọn "giảm chuyển động" thì mặc định tắt hiệu ứng.
const getDefaultEffectsEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  if (typeof window.matchMedia !== 'function') return true;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const FestiveThemeContext = createContext<FestiveThemeContextType | undefined>(
  undefined,
);

const isValidTheme = (value: string): value is FestiveTheme => {
  return Object.values(FestiveTheme).includes(value as FestiveTheme);
};

export function FestiveThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<FestiveTheme>(DEFAULT_FESTIVE_THEME);
  const [effectsEnabled, setEffectsEnabledState] = useState(true);
  const [bgPhotoEnabled, setBgPhotoEnabledState] = useState(false);

  // Load saved theme from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Đợt chuyển mùa: kéo MỘT LẦN mọi người về chủ đề mặc định mới, kể cả người
    // đã từng tự chọn chủ đề khác. Sau khi đã kéo (đánh dấu bằng rollout id),
    // lựa chọn riêng của họ lại được tôn trọng bình thường.
    const rolledOut =
      localStorage.getItem(FESTIVE_SEASON_ROLLOUT_LOCAL_STORAGE_KEY) ===
      FESTIVE_SEASON_ROLLOUT_ID;

    if (!rolledOut) {
      setThemeState(DEFAULT_FESTIVE_THEME);
      localStorage.setItem(
        FESTIVE_THEME_LOCAL_STORAGE_KEY,
        DEFAULT_FESTIVE_THEME,
      );
      localStorage.setItem(
        FESTIVE_SEASON_ROLLOUT_LOCAL_STORAGE_KEY,
        FESTIVE_SEASON_ROLLOUT_ID,
      );
    } else {
      const savedTheme = localStorage.getItem(FESTIVE_THEME_LOCAL_STORAGE_KEY);
      if (savedTheme && isValidTheme(savedTheme)) {
        setThemeState(savedTheme);
      }
    }

    const savedEffects = localStorage.getItem(
      FESTIVE_EFFECTS_LOCAL_STORAGE_KEY,
    );
    setEffectsEnabledState(
      savedEffects === null ? getDefaultEffectsEnabled() : savedEffects === '1',
    );

    const savedBgPhoto = localStorage.getItem('festive-bg-photo-enabled');
    if (savedBgPhoto !== null) {
      setBgPhotoEnabledState(savedBgPhoto === '1');
    }
  }, []);

  const setTheme = useCallback((newTheme: FestiveTheme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FESTIVE_THEME_LOCAL_STORAGE_KEY, newTheme);
    }
  }, []);

  const setEffectsEnabled = useCallback((enabled: boolean) => {
    setEffectsEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        FESTIVE_EFFECTS_LOCAL_STORAGE_KEY,
        enabled ? '1' : '0',
      );
    }
  }, []);

  const setBgPhotoEnabled = useCallback((enabled: boolean) => {
    setBgPhotoEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('festive-bg-photo-enabled', enabled ? '1' : '0');
    }
  }, []);

  const config = getThemeConfig(theme);

  // The provider is ALWAYS mounted. The initial state (DEFAULT_FESTIVE_THEME,
  // effects on) is identical on server and on the first client render, so there
  // is no hydration mismatch to guard against — the effect above only swaps in
  // the saved preference afterwards. Skipping the provider before mount used to
  // make every `useFestiveTheme()` consumer fall back to defaults and then
  // re-render the moment the flag flipped.
  return (
    <FestiveThemeContext.Provider
      value={{
        theme,
        setTheme,
        config,
        effectsEnabled,
        setEffectsEnabled,
        bgPhotoEnabled,
        setBgPhotoEnabled,
      }}
    >
      {children}
    </FestiveThemeContext.Provider>
  );
}

export function useFestiveTheme() {
  const context = useContext(FestiveThemeContext);
  if (context === undefined) {
    // Return default values if used outside provider
    return {
      theme: DEFAULT_FESTIVE_THEME,
      setTheme: () => {},
      config: getThemeConfig(DEFAULT_FESTIVE_THEME),
      effectsEnabled: true,
      setEffectsEnabled: () => {},
      bgPhotoEnabled: false,
      setBgPhotoEnabled: () => {},
    };
  }
  return context;
}
