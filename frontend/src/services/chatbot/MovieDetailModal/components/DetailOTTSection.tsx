import { useState } from "react";
import { type OTTPlatform } from "@/api/movieApi.type";
import { getOttLogoWithFallback } from "@/utils/ottLogoMapper";
import { useMovieStore } from "@/store/useMovieStore";
import { logOttClick } from "@/api/movieApi";

interface DetailOTTSectionProps {
  movieId: number;
  movieTitle: string;
  posterUrl: string;
  ottProviders: OTTPlatform[];
}

export default function DetailOTTSection({
  movieId,
  movieTitle,
  posterUrl,
  ottProviders,
}: DetailOTTSectionProps) {
  const [activeTab, setActiveTab] = useState<"SUBSCRIPTION" | "OTHERS">(
    "SUBSCRIPTION"
  );
  const { userId, sessionId, filters } = useMovieStore();

  // 헬퍼: "HH:MM" -> 분 변환
  const parseMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  if (!ottProviders || ottProviders.length === 0) return null;

  const subscriptions = ottProviders.filter((ott) => {
    const type = ott.payment_type?.toUpperCase();
    // 구독/무료: SUBSCRIPTION, FLATRATE(TMDB표준), FREE, ADS(광고형 무료)
    return (
      type === "SUBSCRIPTION" ||
      type === "FLATRATE" ||
      type === "FREE" ||
      type === "ADS"
    );
  });
  const others = ottProviders.filter((ott) => {
    const type = ott.payment_type?.toUpperCase();
    // 구독/무료가 아닌 모든 것 (RENT, BUY 포함)
    return (
      type !== "SUBSCRIPTION" &&
      type !== "FLATRATE" &&
      type !== "FREE" &&
      type !== "ADS"
    );
  });

  // 탭 정보 구성
  const tabs = [
    {
      id: "SUBSCRIPTION",
      label: "구독",
      count: subscriptions.length,
      data: subscriptions,
    },
    { id: "OTHERS", label: "대여/구매", count: others.length, data: others },
  ] as const;

  // 만약 한쪽 탭에만 데이터가 있다면 자동으로 그 탭을 선택하게 할 수도 있지만,
  // 기본적으로 'SUBSCRIPTION'을 보게 하거나 데이터가 있는 첫 탭을 잡는 것이 좋습니다.

  const activeData = activeTab === "SUBSCRIPTION" ? subscriptions : others;

  return (
    <div className="flex flex-col gap-3">
      {/* 탭 헤더 */}
      <div className="flex border-b border-gray-100 dark:border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2.5 text-[14px] sm:text-[15px] transition-all ${activeTab === tab.id
              ? "font-bold text-gray-900 dark:text-white"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
          >
            {tab.label}
            <span className="ml-1 text-[11px] sm:text-xs opacity-60">
              {tab.count}
            </span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            )}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[50px]">
        {activeData.length > 0 ? (
          <div className="flex flex-wrap gap-2.5 sm:gap-4">
            {activeData.map((ott) => (
              <OTTLink
                key={ott.ott_id}
                ott={ott}
                onClick={() => {
                  // 1. 백엔드 API 호출 (로그인 사용자만, Live Feed용)
                  if (userId) {
                    // ott_id 형식: "8_SUBSCRIPTION_0" -> provider_id = 8
                    const providerId = parseInt(ott.ott_id.split("_")[0], 10);
                    if (!isNaN(providerId)) {
                      logOttClick(movieId, providerId);
                    }
                  }

                  // 2. 클릭 정보 localStorage 저장 (최대 20개 제한) - 피드백 팝업용
                  const logKey = userId
                    ? `movie_click_logs_${userId}`
                    : "movie_click_logs";
                  const existingLogsRaw = localStorage.getItem(logKey);
                  let logs = existingLogsRaw ? JSON.parse(existingLogsRaw) : [];

                  const now = Date.now();
                  const filterMinutes = parseMinutes(filters.time);
                  // 타임 필터가 0이면 최소 1분으로 설정 (방어 로직)
                  const waitMinutes = filterMinutes > 0 ? filterMinutes : 1;
                  const targetShowTime = now + (waitMinutes * 60 * 1000);

                  const newEntry = {
                    movieId,
                    title: movieTitle,
                    posterUrl,
                    clickedAt: now,
                    targetShowTime,
                    sessionId, // 실제 DB 세션 ID (피드백 API용)
                  };

                  // 중복 제거 및 최신화
                  logs = [
                    newEntry,
                    ...logs.filter((l: any) => l.movieId !== movieId),
                  ];

                  // 최대 20개 유지
                  if (logs.length > 20) logs = logs.slice(0, 20);

                  localStorage.setItem(logKey, JSON.stringify(logs));
                  console.log(
                    `🎬 [User ${userId || "Guest"}] OTT 클릭 로그 업데이트:`,
                    newEntry
                  );
                }}
              />
            ))}
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-gray-400 text-sm">제공되는 플랫폼이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OTTLink({ ott, onClick }: { ott: OTTPlatform; onClick: () => void }) {
  return (
    <a
      href={ott.watch_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="flex items-center justify-center p-1.5 sm:p-2 w-[90px] sm:w-[120px] h-[35px] sm:h-[45px] bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors border border-black/5 dark:border-white/5"
    >
      <div className="w-12 sm:w-16 h-6 sm:h-8 flex items-center justify-center">
        <img
          src={getOttLogoWithFallback(ott.ott_name, ott.ott_logo)}
          alt={ott.ott_name}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    </a>
  );
}
