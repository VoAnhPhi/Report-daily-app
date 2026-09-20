import { useCallback, useRef, useState, useEffect } from 'react';

const playTone = async (urgent = false) => {
  if (typeof window === 'undefined') return;
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = urgent ? 880 : 660;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (urgent ? 0.3 : 0.2));
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + (urgent ? 0.3 : 0.2));
  oscillator.addEventListener('ended', () => void context.close());
};

interface SoundNotificationOptions {
  enabled?: boolean;
}

export const useSoundNotification = (
  options: SoundNotificationOptions = {},
) => {
  const { enabled = true } = options;

  // State to track current settings
  const [settings, setSettings] = useState(() => {
    if (typeof window === 'undefined') return { enabled };

    const storedEnabled = localStorage.getItem('sound-notifications-enabled');

    const finalEnabled =
      enabled !== undefined
        ? enabled
        : storedEnabled
          ? JSON.parse(storedEnabled)
          : true;

    return {
      enabled: finalEnabled,
    };
  });

  const isPlayingRef = useRef(false);

  // Listen for localStorage changes to update settings
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = () => {
      const storedEnabled = localStorage.getItem('sound-notifications-enabled');

      const newEnabled =
        enabled !== undefined
          ? enabled
          : storedEnabled
            ? JSON.parse(storedEnabled)
            : true;

      setSettings((prev) => {
        // Only update if value actually changed
        if (prev.enabled !== newEnabled) {
          return { enabled: newEnabled };
        }
        return prev;
      });
    };

    // Listen for storage events (changes from other tabs)
    window.addEventListener('storage', handleStorageChange);

    // Also check for changes periodically (for same-tab changes) - less frequent
    const interval = setInterval(handleStorageChange, 5000); // 5 seconds instead of 1 second

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [enabled]);

  // No need to initialize audio element since we only use generated sounds

  const playNotificationSound = useCallback(async () => {
    // Double-check localStorage in case settings haven't synced
    const currentStoredEnabled = localStorage.getItem(
      'sound-notifications-enabled',
    );
    const currentEnabled = currentStoredEnabled
      ? JSON.parse(currentStoredEnabled)
      : true;

    if (!currentEnabled || !settings.enabled) {
      return;
    }

    if (isPlayingRef.current) {
      return;
    }

    try {
      isPlayingRef.current = true;

      // Always use the same notification sound
      await playTone();

      // Reset playing flag after sound duration
      setTimeout(() => {
        isPlayingRef.current = false;
      }, 200);
    } catch (error) {
      isPlayingRef.current = false;
    }
  }, [settings.enabled]);

  // Play urgent sound for mentions
  const playMentionSound = useCallback(async () => {
    // Double-check localStorage in case settings haven't synced
    const currentStoredEnabled = localStorage.getItem(
      'sound-notifications-enabled',
    );
    const currentEnabled = currentStoredEnabled
      ? JSON.parse(currentStoredEnabled)
      : true;

    if (!currentEnabled || !settings.enabled) {
      return;
    }

    if (isPlayingRef.current) {
      return;
    }

    try {
      isPlayingRef.current = true;

      // Play urgent sound for mentions (different from regular notification)
      await playTone(true);

      // Reset playing flag after sound duration
      setTimeout(() => {
        isPlayingRef.current = false;
      }, 300); // Longer duration for urgent sound
    } catch (error) {
      isPlayingRef.current = false;
    }
  }, [settings.enabled]);

  // Expose to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testSoundNotification = playNotificationSound;
      (window as any).getSoundSettings = () => settings;
    }
  }, [playNotificationSound, settings]);

  // Bỏ trường `isPlaying` khỏi giá trị trả về: nó đọc `isPlayingRef.current`
  // ngay trong render, mà ref đổi thì KHÔNG kích hoạt render lại — người dùng
  // hook luôn nhận một ảnh chụp cũ, vô nghĩa. Ref vẫn giữ nguyên vai trò khoá
  // chống phát chồng tiếng bên trong hai hàm play ở trên. Hai nơi dùng hook này
  // (`hooks/use-notifications.ts`, `hooks/use-notifications-v2.ts`) chỉ lấy
  // `playMentionSound`, nên bỏ trường này không ảnh hưởng nơi nào.
  return {
    playNotificationSound,
    playMentionSound,
  };
};
