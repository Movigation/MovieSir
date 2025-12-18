// ============================================================
// [용도] OTT 로고 매핑 유틸리티
// [사용법] import { getOttLogoPath } from '@/utils/ottLogoMapper';
// ============================================================

// OTT 이름과 로컬 SVG 파일 매핑
const OTT_LOGO_MAP: Record<string, string> = {
    'Netflix': '/src/assets/logos/NETFLEX_Logo.svg',
    'NETFLIX': '/src/assets/logos/NETFLEX_Logo.svg',
    '넷플릭스': '/src/assets/logos/NETFLEX_Logo.svg',

    'Disney+': '/src/assets/logos/Disney+_logo.svg',
    'Disney Plus': '/src/assets/logos/Disney+_logo.svg',
    'DISNEY+': '/src/assets/logos/Disney+_logo.svg',
    '디즈니플러스': '/src/assets/logos/Disney+_logo.svg',
    '디즈니+': '/src/assets/logos/Disney+_logo.svg',

    'Amazon Prime': '/src/assets/logos/Amazon_Prime_Logo.svg',
    'Amazon Prime Video': '/src/assets/logos/Amazon_Prime_Logo.svg',
    'Prime Video': '/src/assets/logos/Amazon_Prime_Logo.svg',
    'AMAZON_PRIME': '/src/assets/logos/Amazon_Prime_Logo.svg',
    '아마존 프라임': '/src/assets/logos/Amazon_Prime_Logo.svg',

    'Apple TV': '/src/assets/logos/Apple_TV_logo.svg',
    'Apple TV+': '/src/assets/logos/Apple_TV_logo.svg',
    'APPLE_TV': '/src/assets/logos/Apple_TV_logo.svg',
    '애플 TV': '/src/assets/logos/Apple_TV_logo.svg',

    'Coupang Play': '/src/assets/logos/COUPANG_PLAY_Logo.svg',
    'COUPANG_PLAY': '/src/assets/logos/COUPANG_PLAY_Logo.svg',
    '쿠팡플레이': '/src/assets/logos/COUPANG_PLAY_Logo.svg',

    'TVING': '/src/assets/logos/TVING_Logo.svg',
    'Tving': '/src/assets/logos/TVING_Logo.svg',
    '티빙': '/src/assets/logos/TVING_Logo.svg',

    'WATCHA': '/src/assets/logos/WATCHA_Logo_Main.svg',
    'Watcha': '/src/assets/logos/WATCHA_Logo_Main.svg',
    '왓챠': '/src/assets/logos/WATCHA_Logo_Main.svg',

    'WAVVE': '/src/assets/logos/WAVVE_Logo.svg',
    'Wavve': '/src/assets/logos/WAVVE_Logo.svg',
    '웨이브': '/src/assets/logos/WAVVE_Logo.svg',

    // ✅ 구글 플레이 무비 추가
    'Google Play Movies': '/src/assets/logos/google_movie.svg',
    'Google Play': '/src/assets/logos/google_movie.svg',
    'Google Movies': '/src/assets/logos/google_movie.svg',
    'GOOGLE_PLAY': '/src/assets/logos/google_movie.svg',
    '구글 플레이': '/src/assets/logos/google_movie.svg',
};

/**
 * OTT 이름으로 로컬 SVG 로고 경로를 반환
 * @param ottName - OTT 서비스 이름
 * @returns 로컬 SVG 파일 경로 또는 null (매핑되지 않은 경우)
 */
export const getOttLogoPath = (ottName: string): string | null => {
    // 정확한 매칭 시도
    const exactMatch = OTT_LOGO_MAP[ottName];
    if (exactMatch) return exactMatch;

    // 대소문자 무시하고 매칭 시도
    const lowerCaseName = ottName.toLowerCase();
    for (const [key, value] of Object.entries(OTT_LOGO_MAP)) {
        if (key.toLowerCase() === lowerCaseName) {
            return value;
        }
    }

    // 부분 매칭 시도 (예: "Netflix Korea" -> "Netflix")
    for (const [key, value] of Object.entries(OTT_LOGO_MAP)) {
        if (lowerCaseName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCaseName)) {
            return value;
        }
    }

    return null;
};

/**
 * OTT 이름으로 로컬 SVG 로고 경로를 반환 (fallback 포함)
 * @param ottName - OTT 서비스 이름
 * @param fallbackUrl - 로컬 로고가 없을 경우 사용할 fallback URL
 * @returns 로컬 SVG 파일 경로 또는 fallback URL
 */
export const getOttLogoWithFallback = (ottName: string, fallbackUrl?: string): string => {
    const localLogo = getOttLogoPath(ottName);
    return localLogo || fallbackUrl || '';
};
