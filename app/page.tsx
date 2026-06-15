import { signOut } from "@/app/actions";
import { coverPhotoForPlant, photoForPlantStage } from "@/lib/plant-photos";
import { PLANTS } from "@/lib/rungarden";
import { createClient } from "@/lib/supabase/server";
import { Activity, ArrowRight, BarChart3, Leaf, LogOut, MapPin, Sprout, Timer, Trophy } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const todayPhoto = photoForPlantStage("바질", 64);

  return (
    <main className="landing-shell">
      <section className="landing-hero">
        <header className="nav landing-nav">
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

        <div className="landing-hero-content">
          <p className="eyebrow">RUNNING × HORTICULTURE</p>
          <h1>달리는 루틴이 자라는 정원</h1>
          <p>
            RunGarden은 러닝 데이터를 작물 성장 단계로 전환해 운동 기록, 원예 관리, 수확 경험을 하나의 루틴으로
            연결합니다.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link className="primary-button" href="/datamanagement">
                내 정원 관리
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ) : (
              <Link className="primary-button" href="/login">
                이메일로 시작하기
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            )}
            <a className="ghost-button" href="#today">
              오늘의 정원
            </a>
          </div>
          <dl className="landing-metrics" aria-label="서비스 요약">
            <div>
              <dt>성장 기준</dt>
              <dd>식물별 거리 목표</dd>
            </div>
            <div>
              <dt>기록 방식</dt>
              <dd>거리 · 시간 · 메모</dd>
            </div>
            <div>
              <dt>완료 경험</dt>
              <dd>100% 수확</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="landing-section today-section" id="today">
        <div className="section-head">
          <p className="eyebrow">TODAY'S GARDEN</p>
          <h2>오늘의 정원</h2>
        </div>
        <div className="today-garden">
          <figure className="today-photo">
            <img src={todayPhoto.src} alt="바질 잎 성장 단계 사진" />
            <figcaption>
              <a href={todayPhoto.source} target="_blank" rel="noreferrer">
                {todayPhoto.credit}
              </a>
            </figcaption>
          </figure>
          <div className="today-copy">
            <div className="phone-top">
              <span>바질 성장률</span>
              <Leaf size={20} aria-hidden="true" />
            </div>
            <strong>64%</strong>
            <p>3.2km 러닝 기록이 오늘의 성장률에 반영되었습니다.</p>
            <div className="progress-track">
              <div style={{ width: "64%" }} />
            </div>
            <div className="mini-stats">
              <span>3.2 km</span>
              <span>22 min</span>
              <span>+16%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-band landing-section">
        <article>
          <Activity size={24} aria-hidden="true" />
          <h2>러닝 기록</h2>
          <p>거리와 시간을 입력해 오늘의 운동량을 저장합니다.</p>
        </article>
        <article>
          <Sprout size={24} aria-hidden="true" />
          <h2>식물 성장</h2>
          <p>누적 거리가 선택한 식물의 성장률로 변환됩니다.</p>
        </article>
        <article>
          <MapPin size={24} aria-hidden="true" />
          <h2>코스 추천</h2>
          <p>현재 위치나 검색 위치 주변의 러닝코스를 확인합니다.</p>
        </article>
      </section>

      <section className="split-section landing-section" id="demo">
        <div>
          <p className="eyebrow">SERVICE FLOW</p>
          <h2>러닝 습관을 원예 루틴으로 바꿉니다</h2>
          <p>
            운동 기록은 금방 흩어지고, 원예는 꾸준한 관리가 어렵습니다. RunGarden은 둘을 하나의 관리 흐름으로
            묶어 오늘의 행동이 성장으로 보이는 피드백을 제공합니다.
          </p>
        </div>
        <div className="flow-list">
          <span><Timer size={18} aria-hidden="true" /> 1. 오늘 러닝 거리 입력</span>
          <span><BarChart3 size={18} aria-hidden="true" /> 2. 식물별 성장률 계산</span>
          <span><Trophy size={18} aria-hidden="true" /> 3. 성장 완료 후 수확</span>
        </div>
      </section>

      <section className="plant-gallery landing-section">
        <div className="section-head">
          <p className="eyebrow">PLANTS</p>
          <h2>키울 수 있는 식물</h2>
        </div>
        <div className="plant-grid">
          {PLANTS.map((plant) => {
            const plantPhoto = coverPhotoForPlant(plant.name);

            return (
              <article key={plant.name} className="plant-card landing-plant-card" style={{ "--plant": plant.color } as React.CSSProperties}>
                <img src={plantPhoto.src} alt={`${plant.name} 사진`} />
                <div>
                  <span className="plant-dot" />
                  <h3>{plant.name}</h3>
                  <p>{plant.subtitle}</p>
                  <strong>{plant.requirement}</strong>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
