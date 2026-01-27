// [용도] 영화 관련 API 타입 정의
// [사용법] import { Movie, WatchHistory, Recommendation } from "@/api/movieApi.type";

export interface Movie {
  id: number;
  tmdb_id?: number; // TMDB ID (백엔드 API 호출용, id와 다를 수 있음)
  title: string;
  genres: string[];
  year?: number;
  rating?: number;
  popularity?: number;
  poster: string;
  description: string;
  popular: boolean;
  watched?: boolean;
  runtime?: number; // 러닝타임 (분 단위)
  isEmpty?: boolean; // 빈 카드 플래그 (추천 결과 없을 때 사용)
  adult?: boolean; // 성인 영화 여부
  isSkeleton?: boolean; // 로딩 스켈레톤 플래그
}

export interface WatchHistory {
  id: number;
  userId: number;
  movieId: number;
  watchedAt: string;
  rating: number;
}

export interface WatchHistoryWithMovie extends WatchHistory {
  movie: Movie;
}

export interface Recommendation {
  id: number;
  userId: number;
  movieId: number;
  recommendedAt: string;
  reason: string;
}

export interface RecommendationWithMovie extends Recommendation {
  movie: Movie;
}

export interface UserStats {
  totalWatched: number;
  averageRating: number;
  favoriteGenre: string;
  watchedByGenre: { [genre: string]: number };
}

export interface MovieRecommendationResult {
  algorithmic: Movie[]; // 알고리즘 기반 추천
  popular: Movie[]; // 인기작
}

// [용도] 백엔드 API 응답 타입
export interface BackendMovieRecommendation {
  movie_id: number;
  title: string;
  runtime: number;
  genres: string[]; // 장르 이름 배열
  poster_url: string;
  vote_average: number;
  overview: string;
}

export interface BackendRecommendResponse {
  results: BackendMovieRecommendation[]; // ✅ recommendations → results
}

// [용도] 장르 매핑: 한글 이름 <-> ID
export interface GenreMapping {
  [key: string]: number; // 예: "SF" -> 15
}

// ============================================================
// [영화 상세 정보 타입 정의]
// ============================================================

// [용도] 배우/출연진 정보
export interface Cast {
  name: string;
  character: string;
  profile_url: string;
}

// [용도] OTT 플랫폼 정보
export interface OTTPlatform {
  ott_id: string; // ✅ 고유 ID (provider_id + payment_type + index 조합)
  ott_name: string;
  ott_logo: string;
  watch_url: string;
  payment_type: "SUBSCRIPTION" | "RENT" | "BUY"; // 결제 타입 필수
}

// [용도] 사용자의 영화 상태 정보
export interface UserStatus {
  liked: boolean;
  watched: boolean;
  bookmarked: boolean;
  watched_date?: string;
  rating?: number;
  comment?: string;
}

// ============================================================
// [V2 API 타입 정의] - 시간 맞춤 조합 추천
// ============================================================

// [용도] AI 추천 영화 (v2 응답용)
export interface RecommendedMovieV2 {
  movie_id: number;
  tmdb_id?: number | null;
  title: string;
  runtime: number;
  genres: string[];
  vote_average: number;
  vote_count: number;
  overview: string;
  release_date: string;
  poster_path: string | null;
  score?: number;
  adult?: boolean; // 성인 영화 여부
}

// [용도] 트랙별 추천 결과
export interface TrackResultV2 {
  label: string;
  movies: RecommendedMovieV2[];
  total_runtime: number;
}

// [용도] V2 추천 응답
export interface RecommendResponseV2 {
  track_a: TrackResultV2;
  track_b: TrackResultV2;
  elapsed_time?: number;
  session_id?: number; // 추천 세션 ID (피드백용)
}

// [용도] 개별 영화 재추천 요청
export interface ReRecommendRequest {
  source_movie_id?: number;  // 교체 대상 영화 ID (로깅용)
  target_runtime: number;
  excluded_ids: number[];
  track: "a" | "b";
  genres?: string[];
  exclude_adult?: boolean;
  session_id?: number;  // 추천 세션 ID (로깅용)
}

// [용도] 개별 영화 재추천 응답
export interface ReRecommendResponse {
  movie: RecommendedMovieV2 | null;
  success: boolean;
  message: string;
}

// [용도] 영화 상세 정보 (백엔드 API 응답)
export interface MovieDetail {
  movie_id: number;
  title: string;
  poster_url: string;
  backdrop_url: string;
  overview: string;
  runtime: number;
  release_date: string;
  genres: string[];
  vote_average: number; // 평균 평점 (기존 rating → vote_average로 통일)
  vote_count: number;
  popularity: number; // 인기도
  adult?: boolean; // 성인 영화 여부
  director?: string; // 감독 (optional: 백엔드에서 제공하지 않을 수 있음)
  cast?: Cast[]; // 출연진 (optional)
  tagline?: string; // 태그라인 (optional)
  ott_providers?: OTTPlatform[]; // OTT 플랫폼 (기존 available_ott → ott_providers로 통일)
  tags?: string[]; // 태그 (optional)
  user_status?: UserStatus; // 사용자 상태 (좋아요, 시청 여부 등)
}
