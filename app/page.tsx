import { signOut } from "@/app/actions";
import { PLANTS } from "@/lib/rungarden";
import { createClient } from "@/lib/supabase/server";
import { Activity, BarChart3, Leaf, LogOut, MapPin, Sprout, Timer, Trophy } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <main className="site-shell">
      <header className="nav">
        <Link className="brand" href="/">
          <Sprout size={24} aria-hidden="true" />
          <span>RunGarden</span>
        </Link>
        <div className="nav-actions">
          {user ? (
            <>
              <Link className="ghost-button" href="/datamanagement">
                내 정원
              </Link>
              <form action={signOut}>
                <button className="icon-text-button" type="submit">
                  <LogOut size={17} aria-hidden="true" />
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link className="primary-button" href="/login">
              이메일로 시작
            </Link>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">RUNNING × HORTICULTURE</p>
          <h1>달린 만큼 식물이 자라는 디지털 정원</h1>
          <p>
            RunGarden은 러닝 거리와 시간을 식물 성장 에너지로 바꾸어 운동 습관과 원예 관심을 함께 키우는 서비스입니다.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link className="primary-button" href="/datamanagement">
                내 정원 관리
              </Link>
            ) : (
              <Link className="primary-button" href="/login">
                이메일로 시작하기
              </Link>
            )}
            <a className="ghost-button" href="#demo">
              데모 보기
            </a>
          </div>
        </div>

        <div className="phone-demo" aria-label="RunGarden 앱 미리보기">
          <div className="phone-top">
            <span>오늘의 정원</span>
            <Leaf size={20} aria-hidden="true" />
          </div>
          <div className="plant-orbit">
            <div className="sun" />
            <img src="/plant-growth.svg" alt="" />
          </div>
          <div className="progress-card">
            <span>바질 성장률</span>
            <strong>64%</strong>
            <div className="progress-track">
              <div style={{ width: "64%" }} />
            </div>
          </div>
          <div className="mini-stats">
            <span>3.2 km</span>
            <span>22 min</span>
            <span>+16%</span>
          </div>
        </div>
      </section>

      <section className="feature-band">
        <article>
          <Activity size={24} aria-hidden="true" />
          <h2>러닝 기록</h2>
          <p>거리와 시간을 입력해 오늘의 운동량을 저장합니다.</p>
        </article>
        <article>
          <Sprout size={24} aria-hidden="true" />
          <h2>식물 성장</h2>
          <p>누적 거리가 식물 성장률로 변환됩니다.</p>
        </article>
        <article>
          <MapPin size={24} aria-hidden="true" />
          <h2>씨앗 수집 컨셉</h2>
          <p>러닝 경로에서 씨앗을 발견하는 확장 아이디어를 담았습니다.</p>
        </article>
      </section>

      <section className="split-section" id="demo">
        <div>
          <p className="eyebrow">SERVICE FLOW</p>
          <h2>러닝 습관을 원예 루틴으로 바꿉니다</h2>
          <p>
            운동 기록은 금방 흩어지고, 원예는 꾸준한 관리가 어렵습니다. RunGarden은 둘을 하나의 루틴으로 묶어
            “오늘 달리면 내 식물이 자란다”는 즉각적인 피드백을 줍니다.
          </p>
        </div>
        <div className="flow-list">
          <span><Timer size={18} aria-hidden="true" /> 1. 오늘 러닝 거리 입력</span>
          <span><BarChart3 size={18} aria-hidden="true" /> 2. 누적 거리와 성장률 계산</span>
          <span><Trophy size={18} aria-hidden="true" /> 3. 식물 성장 단계 확인</span>
        </div>
      </section>

      <section className="plant-gallery">
        <div className="section-head">
          <p className="eyebrow">PLANTS</p>
          <h2>키울 수 있는 식물</h2>
        </div>
        <div className="plant-grid">
          {PLANTS.map((plant) => (
            <article key={plant.name} className="plant-card" style={{ "--plant": plant.color } as React.CSSProperties}>
              <div className="plant-dot" />
              <h3>{plant.name}</h3>
              <p>{plant.subtitle}</p>
              <span>{plant.requirement}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
