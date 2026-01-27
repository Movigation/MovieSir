import { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import './IntroScreen.css';

interface IntroScreenProps {
  onComplete: () => void;
  duration?: number;
}

export default function IntroScreen({ onComplete, duration = 7500 }: IntroScreenProps) {
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  const [planeData, setPlaneData] = useState<object | null>(null);
  const [carData, setCarData] = useState<object | null>(null);

  useEffect(() => {
    fetch('/lottie/Airplane.json').then(r => r.json()).then(setPlaneData).catch(() => {});
    fetch('/lottie/Tourists by car.json').then(r => r.json()).then(setCarData).catch(() => {});
  }, []);

  useEffect(() => {
    const phase2 = setTimeout(() => setPhase(2), 2500);
    const phase3 = setTimeout(() => setPhase(3), 5000);
    const phase4 = setTimeout(() => setPhase(4), 6800);
    const complete = setTimeout(() => onComplete(), duration);

    return () => {
      clearTimeout(phase2);
      clearTimeout(phase3);
      clearTimeout(phase4);
      clearTimeout(complete);
    };
  }, [onComplete, duration]);

  return (
    <div
      className={`intro-screen ${phase === 4 ? 'fade-out' : ''}`}
      onClick={onComplete}
      style={{ cursor: 'pointer' }}
    >
      <div className="intro-bg" />

      {/* Phase 1: 시간만 알려주세요 */}
      <div className={`intro-scene ${phase === 1 ? 'active' : 'exit'}`}>
        <div className="text-container">
          <span className="main-text">시간만 알려주세요</span>
        </div>
        <div className="lottie-container">
          {planeData && <Lottie animationData={planeData} loop className="lottie-anim" />}
        </div>
      </div>

      {/* Phase 2: 영화는 제가 고를게요 */}
      <div className={`intro-scene ${phase === 2 ? 'active' : phase > 2 ? 'exit' : ''}`}>
        <div className="text-container">
          <span className="main-text">영화는 제가 고를게요</span>
        </div>
        <div className="lottie-container">
          {carData && <Lottie animationData={carData} loop className="lottie-anim" />}
        </div>
      </div>

      {/* Phase 3: 브랜드 */}
      <div className={`intro-scene brand-scene ${phase >= 3 ? 'active' : ''}`}>
        <img src="/moviesir-logo.png" alt="MovieSir" className="brand-logo" />
        <div className="brand-text">
          <span className="brand-sub">이동 시간 맞춤형 콘텐츠 추천 서비스</span>
          <span className="brand-name">무비서</span>
        </div>
      </div>

      <button className="skip-btn" onClick={onComplete}>
        건너뛰기
      </button>
    </div>
  );
}
