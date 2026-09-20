// =============================================================================
// FESTIVE THEME CONSTANTS
// Easy to modify when switching themes or adding new ones
// =============================================================================

export enum FestiveTheme {
  Autumn = 'autumn',
  Summer = 'summer',
  Christmas = 'christmas',
  NewYear = 'new_year',
}

// Local storage key for saving user's theme preference
export const FESTIVE_THEME_LOCAL_STORAGE_KEY = 'festive-theme';

// Bật/tắt ảnh nền phong cảnh/lễ hội (mặc định tắt để tối ưu tốc độ & độ sạch)
export const FESTIVE_BG_PHOTO_LOCAL_STORAGE_KEY = 'festive-bg-photo-enabled';

// Bật/tắt hiệu ứng rơi (lá, cánh hoa, tuyết). Người dùng máy yếu có thể tắt cho
// đỡ giật; mặc định theo tuỳ chọn "giảm chuyển động" của hệ điều hành.
export const FESTIVE_EFFECTS_LOCAL_STORAGE_KEY = 'festive-effects-enabled';

// Đợt chuyển mùa: khi đổi chủ đề mặc định, người đã từng tự chọn chủ đề vẫn giữ
// lựa chọn cũ nên sẽ không thấy mùa mới. Đổi hằng số bên dưới để KÉO MỘT LẦN
// toàn bộ người dùng về DEFAULT_FESTIVE_THEME; sau lần kéo đó ai đổi lại chủ đề
// khác thì lựa chọn của họ vẫn được tôn trọng như cũ.
export const FESTIVE_SEASON_ROLLOUT_LOCAL_STORAGE_KEY =
  'festive-season-rollout';
export const FESTIVE_SEASON_ROLLOUT_ID = 'autumn-2026-07';

// Default theme (change this to switch default)
export const DEFAULT_FESTIVE_THEME: FestiveTheme = FestiveTheme.Autumn;

// =============================================================================
// BACKGROUND ROTATION SETTINGS
// =============================================================================

// How often to rotate backgrounds (in milliseconds)
export const BACKGROUND_ROTATION_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

// =============================================================================
// SHARED UI PALETTE SHAPE
// One slot per logical role; each theme provides its own concrete classes.
// =============================================================================

export interface FestiveUIPalette {
  sectionBlend: string; // inner gradient stop of section wash
  headingPrimary: string; // main h2 over themed background
  searchBackground: string; // search input background in themed section
  headingSecondary: string; // smaller h3 over themed background
  subtleText: string; // muted body / empty / loading
  emphasisText: string; // inline highlighted phrase
  numberHighlight: string; // counter / big number
  cardSurface: string; // translucent panel (carousel container, etc.)
  cardSurfaceFade: string; // side-fade gradient start (e.g. "from-amber-50/60")
  cardItem: string; // tile inside the surface
  avatarBorder: string;
  avatarBorderHover: string; // already includes "group-hover:" prefix
  avatarFallback: string;
  rankBadge: string;
  cardNameText: string; // name text inside a card on themed bg
  cardRefText: string; // reference / sub text inside a card
  primaryButton: string; // CTA inside themed section
}

// =============================================================================
// AUTUMN THEME CONFIG (default)
// Premium Vietnamese Autumn — "Thu sang":
// giấy dó kem ấm + hổ phách/lúa chín + cam đất hồng chín + đỏ lá phong
// + xanh rêu ô liu, điểm nét kim nhũ. Nền SÁNG nên chữ dùng tông nâu hạt dẻ đậm.
// =============================================================================

export const AUTUMN_CONFIG = {
  backgrounds: [
    '/backgrounds/autumn/autumn-bg-1.png',
    '/backgrounds/autumn/autumn-bg-2.png',
    '/backgrounds/autumn/autumn-bg-3.png',
    '/backgrounds/autumn/autumn-bg-4.png',
  ],

  // Kem giấy dó → mơ chín → xám ấm (khớp lớp sương xám-rêu dưới đáy ảnh nền)
  gradientClass: 'from-amber-50 via-orange-100 to-stone-200',

  // Chưa có nhạc nền riêng cho mùa thu; trường này hiện chưa có nơi tiêu thụ.
  musicTracks: [] as { id: string; label: string; path: string }[],

  // Lá rơi: to hơn, chậm hơn và đảo nhiều hơn cánh hoa Tết
  overlay: {
    spriteSheet: '/overlays/autumn-overlays.png',
    // Khai báo đúng kích thước gốc của sheet để toạ độ sprite là pixel thật
    sheetWidth: 1536,
    sheetHeight: 1024,

    petalCount: 18,
    // Chỉ dùng khi bỏ petalOpacityRange bên dưới
    petalOpacity: 0.3,
    // Mỗi chiếc lá bốc một độ mờ riêng trong khoảng này -> có chiều sâu xa/gần
    // mà vẫn đủ nhạt để không kéo mắt khỏi nội dung chính của trang.
    // Trần 0.3 là mức đậm nhất được phép.
    petalOpacityRange: [0.1, 0.3] as [number, number],
    speedRange: [14, 26] as [number, number],
    sizeRange: [28, 64] as [number, number],
    swayRange: 100,
  },

  // Bounding box đo từ kênh alpha của autumn-overlays.png (alpha >= 16)
  petalSprites: [
    { x: 127, y: 60, w: 231, h: 248 }, // Lá phong đỏ
    { x: 472, y: 68, w: 230, h: 233 }, // Lá phong cam
    { x: 807, y: 92, w: 239, h: 211 }, // Lá bạch quả vàng
    { x: 1178, y: 116, w: 234, h: 149 }, // Lá khô nâu cuộn
    { x: 180, y: 448, w: 128, h: 108 }, // Lá nhỏ cam
    { x: 488, y: 416, w: 220, h: 152 }, // Chùm lá xanh ô liu
    { x: 862, y: 421, w: 172, h: 175 }, // Đồng tiền vàng
    { x: 186, y: 716, w: 116, h: 155 }, // Đèn lồng Trung Thu
    { x: 525, y: 716, w: 137, h: 163 }, // Lá vàng nhạt
    { x: 869, y: 719, w: 137, h: 160 }, // Lá cam đỏ 1
    { x: 1196, y: 722, w: 150, h: 154 }, // Lá cam đỏ 2
  ],

  // UI palette — nâu hạt dẻ + cam đất + hổ phách trên nền kem sáng
  uiPalette: {
    sectionBlend: 'via-orange-100/30',
    headingPrimary: 'text-[#5C2E12] text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4',
    headingSecondary: 'text-orange-800',
    searchBackground: 'bg-white p-4 rounded-lg',
    subtleText: 'text-stone-700',
    emphasisText: 'text-orange-700',
    numberHighlight: 'text-orange-600',
    cardSurface: 'bg-orange-50/45 border border-amber-200/50 backdrop-blur-md',
    cardSurfaceFade: 'from-orange-50/70',
    cardItem: 'bg-white/60 border border-amber-100/70',
    avatarBorder: 'border-amber-400/50',
    avatarBorderHover: 'group-hover:border-orange-400/80',
    avatarFallback: 'bg-orange-700 text-amber-50',
    rankBadge: 'bg-amber-500 text-[#4A2410]',
    cardNameText: 'text-stone-800',
    cardRefText: 'text-orange-700',
    primaryButton:
      'bg-orange-700/95 text-amber-50 font-semibold hover:bg-orange-700 border border-orange-800/30',
  } satisfies FestiveUIPalette,
} as const;

// =============================================================================
// SUMMER THEME CONFIG
// Premium Vietnamese Summer Serenity:
// warm ivory + champagne gold + soft turquoise + muted tropical green
// =============================================================================

export const SUMMER_CONFIG = {
  backgrounds: [
    '/backgrounds/summer/summer-bg-1.png',
    '/backgrounds/summer/summer-bg-2.png',
    '/backgrounds/summer/summer-bg-3.png',
    '/backgrounds/summer/summer-bg-4.png',
  ],

  // Warm ivory → champagne → soft turquoise
  gradientClass: 'from-amber-50 via-stone-50 to-cyan-100',

  musicTracks: [
    {
      id: 'happy-new-year',
      label: 'Happy New Year',
      path: '/audio/happy-new-year.mp3',
    },
  ],

  // Airy, subtle overlay — minimal "gold foil" feel
  overlay: {
    spriteSheet: '/overlays/tet-overlays.png',
    sheetWidth: 2048,
    sheetHeight: 1117,

    petalCount: 14,
    petalOpacity: 0.4,
    speedRange: [12, 22] as [number, number],
    sizeRange: [24, 52] as [number, number],
    swayRange: 80,
  },

  // Gold-only subset (no Tet pinks/reds) — coin, sun, lotus-yellow
  petalSprites: [
    { x: 1358, y: 174, w: 240, h: 239 }, // Gold circle / sun
    { x: 154, y: 637, w: 348, h: 341 }, // Yellow lotus 1
    { x: 982, y: 637, w: 312, h: 347 }, // Yellow lotus 3
    { x: 1683, y: 672, w: 239, h: 279 }, // Gold coin
  ],

  // UI palette — light, warm, premium, readable on light backdrop
  uiPalette: {
    sectionBlend: 'via-amber-100/30',
    headingPrimary: 'text-[#163B4B] text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4',
    headingSecondary: 'text-amber-700',
    searchBackground: 'bg-white p-4 rounded-lg',
    subtleText: 'text-stone-600',
    emphasisText: 'text-amber-700',
    numberHighlight: 'text-amber-600',
    cardSurface: 'bg-amber-50/40 border border-amber-200/40 backdrop-blur-md',
    cardSurfaceFade: 'from-amber-50/70',
    cardItem: 'bg-white/60 border border-amber-100/60',
    avatarBorder: 'border-amber-300/50',
    avatarBorderHover: 'group-hover:border-amber-400/80',
    avatarFallback: 'bg-amber-500 text-teal-900',
    rankBadge: 'bg-amber-400 text-teal-900',
    cardNameText: 'text-stone-800',
    cardRefText: 'text-teal-700',
    primaryButton:
      'bg-amber-300/90 text-teal-900 font-semibold hover:bg-amber-300 border border-amber-300/60',
  } satisfies FestiveUIPalette,
} as const;

// =============================================================================
// NEW YEAR THEME CONFIG
// =============================================================================

export const NEW_YEAR_CONFIG = {
  backgrounds: [
    '/backgrounds/tet-background-1.png',
    '/backgrounds/tet-background-2.png',
    '/backgrounds/tet-background-3.png',
  ],

  gradientClass: 'from-red-950 via-rose-950 to-amber-950',

  musicTracks: [
    {
      id: 'gong-xi-fa-cai',
      label: 'Gong Xi Fa Cai',
      path: '/audio/gong-xi-fa-cai.mp3',
    },
    {
      id: 'chinese-new-year',
      label: 'Chinese New Year',
      path: '/audio/chinese-new-year.mp3',
    },
    {
      id: 'happy-new-year',
      label: 'Happy New Year',
      path: '/audio/happy-new-year.mp3',
    },
    {
      id: 'gong-xi-gong-xi',
      label: 'Gong Xi Gong Xi',
      path: '/audio/gong-xi-gong-xi.mp3',
    },
    {
      id: 'long-phung-sum-vay',
      label: 'Long Phung Sum Vay',
      path: '/audio/long-phung-sum-vay.mp3',
    },
  ],

  overlay: {
    spriteSheet: '/overlays/tet-overlays.png',
    sheetWidth: 2048,
    sheetHeight: 1117,

    petalCount: 25,
    petalOpacity: 0.7,
    speedRange: [8, 15] as [number, number],
    sizeRange: [20, 45] as [number, number],
    swayRange: 50,
  },

  petalSprites: [
    { x: 118, y: 139, w: 352, h: 369 },
    { x: 574, y: 118, w: 332, h: 417 },
    { x: 954, y: 129, w: 296, h: 368 },
    { x: 1358, y: 174, w: 240, h: 239 },
    { x: 1694, y: 160, w: 236, h: 313 },
    { x: 154, y: 637, w: 348, h: 341 },
    { x: 586, y: 611, w: 332, h: 388 },
    { x: 982, y: 637, w: 312, h: 347 },
    { x: 1683, y: 672, w: 239, h: 279 },
  ],

  // UI palette — Tet red+gold on dark backdrop (preserves existing look)
  uiPalette: {
    sectionBlend: 'via-red-950/15',
    headingPrimary: 'text-amber-200 text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4',
    headingSecondary: 'text-yellow-200',
    subtleText: 'text-amber-100/80',
    emphasisText: 'text-amber-200',
    numberHighlight: 'text-yellow-300',
    searchBackground: 'bg-white p-4 rounded-lg',
    cardSurface: 'bg-red-950/30 border border-amber-300/10 backdrop-blur-md',
    cardSurfaceFade: 'from-red-950/70',
    cardItem: 'bg-red-950/20 border border-amber-200/10',
    avatarBorder: 'border-amber-300/20',
    avatarBorderHover: 'group-hover:border-amber-300/50',
    avatarFallback: 'bg-amber-600 text-white',
    rankBadge: 'bg-yellow-300 text-red-950',
    cardNameText: 'text-slate-50',
    cardRefText: 'text-amber-200',
    primaryButton:
      'bg-yellow-300/90 text-red-950 font-semibold hover:bg-yellow-300 border border-amber-200/30',
  } satisfies FestiveUIPalette,
} as const;

// =============================================================================
// CHRISTMAS THEME CONFIG
// =============================================================================

export const CHRISTMAS_CONFIG = {
  gradientClass: 'from-slate-950 via-emerald-950 to-teal-900',

  backgrounds: [] as string[],

  musicTracks: [
    {
      id: 'jingle-bells',
      label: 'Jingle Bells',
      path: '/audio/jingle-bells.mp3',
    },
    {
      id: 'we-wish-you-a-merry-christmas',
      label: 'We Wish You a Merry Christmas',
      path: '/audio/we-wish-you-a-merry-christmas.mp3',
    },
    {
      id: 'happy-new-year',
      label: 'Happy New Year',
      path: '/audio/happy-new-year.mp3',
    },
  ],

  overlay: {
    snowflakeCount: 160,
    color: '#ffffff',
  },

  // UI palette — Christmas emerald+amber on dark backdrop
  uiPalette: {
    sectionBlend: 'via-emerald-950/10',
    headingPrimary: 'text-amber-200 text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4',
    headingSecondary: 'text-amber-200',
    subtleText: 'text-rose-100/80',
    emphasisText: 'text-emerald-200',
    numberHighlight: 'text-amber-300',
    searchBackground: 'bg-white p-4 rounded-lg',
    cardSurface: 'bg-slate-900/40 border border-white/10 backdrop-blur-md',
    cardSurfaceFade: 'from-slate-900/80',
    cardItem: 'bg-slate-950/20 border border-white/10',
    avatarBorder: 'border-emerald-300/30',
    avatarBorderHover: 'group-hover:border-emerald-300/60',
    avatarFallback: 'bg-emerald-600 text-white',
    rankBadge: 'bg-amber-300 text-slate-950',
    cardNameText: 'text-slate-50',
    cardRefText: 'text-emerald-200',
    primaryButton:
      'bg-emerald-300/40 text-white font-medium hover:bg-emerald-300/60 border border-emerald-300/40',
  } satisfies FestiveUIPalette,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const getThemeConfig = (theme: FestiveTheme) => {
  switch (theme) {
    case FestiveTheme.Autumn:
      return AUTUMN_CONFIG;
    case FestiveTheme.Summer:
      return SUMMER_CONFIG;
    case FestiveTheme.NewYear:
      return NEW_YEAR_CONFIG;
    case FestiveTheme.Christmas:
      return CHRISTMAS_CONFIG;
    default:
      return AUTUMN_CONFIG;
  }
};

export const getThemeLabel = (theme: FestiveTheme): string => {
  switch (theme) {
    case FestiveTheme.Autumn:
      return 'Mùa Thu';
    case FestiveTheme.Summer:
      return 'Mùa Hè';
    case FestiveTheme.NewYear:
      return 'Tết Nguyên Đán';
    case FestiveTheme.Christmas:
      return 'Giáng Sinh';
    default:
      return 'Mùa Thu';
  }
};

export const getAllThemes = (): { value: FestiveTheme; label: string }[] => [
  { value: FestiveTheme.Autumn, label: 'Mùa Thu 🍂' },
  { value: FestiveTheme.Summer, label: 'Mùa Hè 🌴' },
  { value: FestiveTheme.NewYear, label: 'Tết Nguyên Đán 🧧' },
  { value: FestiveTheme.Christmas, label: 'Giáng Sinh 🎄' },
];

// Convenience: pull UI palette by theme (every config has uiPalette now).
export const getThemeUIPalette = (theme: FestiveTheme): FestiveUIPalette =>
  getThemeConfig(theme).uiPalette;
