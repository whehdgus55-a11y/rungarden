import { choosePlant, deleteRunLog, harvestPlant, signOut } from "@/app/actions";
import { RunForm } from "@/components/run-form";
import {
  PLANTS,
  calculateGrowth,
  calculateTotalDistance,
  formatDate,
  formatKm,
  growthGoalForPlant,
  growthStage,
  isPlantName
} from "@/lib/rungarden";
import { createClient } from "@/lib/supabase/server";
import type { RunLog, UserPlant } from "@/lib/types";
import { ArrowLeft, Footprints, Gauge, Leaf, LogOut, Trash2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function DataManagementPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const message = getParam(params, "message");
  const error = getParam(params, "error");
  const plantParam = getParam(params, "plant");
  const currentPlant = plantParam && isPlantName(plantParam) ? plantParam : "바질";
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?message=${encodeURIComponent("데이터 관리는 이메일 로그인 후 이용할 수 있습니다.")}`);
  }

  const [{ data: logsData }, { data: plantData }, { data: plantRowsData }] = await Promise.all([
    supabase
      .from("run_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("plant_name", currentPlant)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_plants")
      .select("*")
      .eq("user_id", user.id)
      .eq("plant_name", currentPlant)
      .maybeSingle(),
    supabase.from("user_plants").select("*").eq("user_id", user.id)
  ]);

  const logs = (logsData ?? []) as RunLog[];
  const plant = plantData as UserPlant | null;
  const plantRows = (plantRowsData ?? []) as UserPlant[];
  const growthByPlant = new Map(plantRows.map((row) => [row.plant_name, Number(row.growth_percent)]));
  const harvestByPlant = new Map(plantRows.map((row) => [row.plant_name, Number(row.harvest_count ?? 0)]));
  const totalDistance = calculateTotalDistance(logs);
  const harvestedDistance = Math.min(Number(plant?.harvested_distance_km ?? 0), totalDistance);
  const distanceAfterHarvest = Math.max(0, totalDistance - harvestedDistance);
  const growthPercent = Number(plant?.growth_percent ?? calculateGrowth(distanceAfterHarvest, currentPlant));
  const harvestCount = Number(plant?.harvest_count ?? 0);
  const goalDistance = growthGoalForPlant(currentPlant);
  const remainingDistance = Math.max(0, goalDistance - distanceAfterHarvest);
  const canHarvest = growthPercent >= 100;
  const avgPace =
    totalDistance > 0 ? logs.reduce((sum, log) => sum + Number(log.duration_min || 0), 0) / totalDistance : 0;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-nav">
        <Link className="back-link" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          RunGarden
        </Link>
        <div className="nav-actions">
          <span className="user-chip">{user.email}</span>
          <form action={signOut}>
            <button className="icon-text-button" type="submit">
              <LogOut size={17} aria-hidden="true" />
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <section className="dashboard-hero run-hero">
        <div>
          <p className="eyebrow">RUN DASHBOARD</p>
          <h1>{currentPlant} 러닝 정원</h1>
          <p>선택한 식물에 기록한 러닝만 해당 식물 성장률에 반영됩니다.</p>
        </div>
        <div className="growth-summary">
          <Footprints size={22} aria-hidden="true" />
          <span>{currentPlant}</span>
          <strong>{growthPercent}%</strong>
        </div>
      </section>

      {message ? <div className="notice success">{message}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}

      <section className="pace-strip" aria-label="러닝 요약">
        <article>
          <Footprints size={20} aria-hidden="true" />
          <span>이번 재배 거리</span>
          <strong>{formatKm(distanceAfterHarvest)}</strong>
        </article>
        <article>
          <Gauge size={20} aria-hidden="true" />
          <span>평균 페이스 지표</span>
          <strong>{avgPace > 0 ? `${avgPace.toFixed(1)} 분/km` : "기록 전"}</strong>
        </article>
        <article>
          <Leaf size={20} aria-hidden="true" />
          <span>성장 단계</span>
          <strong>{growthStage(growthPercent)}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel plant-panel">
          <div className="panel-heading">
            <p className="eyebrow">MY PLANT</p>
            <h2>{currentPlant} 성장 단계</h2>
          </div>
          <div className="plant-stage">
            <img src="/plant-growth.svg" alt="" />
            <div>
              <strong>{growthStage(growthPercent)}</strong>
              <p>
                {canHarvest
                  ? "성장률 100% 달성! 수확 후 다음 재배가 0%부터 시작됩니다."
                  : `완료까지 ${formatKm(remainingDistance)} 남았습니다.`}
              </p>
            </div>
          </div>
          <div className="progress-track large">
            <div style={{ width: `${growthPercent}%` }} />
          </div>
          <div className="metric-row">
            <span>
              이번 재배 <strong>{formatKm(distanceAfterHarvest)}</strong>
            </span>
            <span>
              목표 거리 <strong>{formatKm(goalDistance)}</strong>
            </span>
            <span>
              수확 횟수 <strong>{harvestCount}회</strong>
            </span>
          </div>
          {canHarvest ? (
            <form action={harvestPlant} style={{ marginTop: 14 }}>
              <input type="hidden" name="plant_name" value={currentPlant} />
              <button className="primary-button full" type="submit">
                <Leaf size={18} aria-hidden="true" />
                수확하기
              </button>
            </form>
          ) : null}
        </article>

        <article className="panel run-entry-panel">
          <div className="panel-heading">
            <p className="eyebrow">LOG RUN</p>
            <h2>{currentPlant}에 러닝 기록</h2>
          </div>
          <RunForm plantName={currentPlant} />
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">PLANT SELECT</p>
            <h2>재배 식물 선택</h2>
          </div>
          <span className="soft-pill">식물별 러닝 기록 분리</span>
        </div>
        <div className="select-grid">
          {PLANTS.map((plantOption) => (
            <form key={plantOption.name} action={choosePlant}>
              <input type="hidden" name="plant_name" value={plantOption.name} />
              <button
                className={`select-card ${plantOption.name === currentPlant ? "active" : ""}`}
                type="submit"
                style={{ "--plant": plantOption.color } as React.CSSProperties}
              >
                <span className="plant-dot" />
                <strong>{plantOption.name}</strong>
                <small>{plantOption.requirement}</small>
                <em>
                  성장 {Math.round(growthByPlant.get(plantOption.name) ?? 0)}% · 수확{" "}
                  {harvestByPlant.get(plantOption.name) ?? 0}회
                </em>
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">RUN HISTORY</p>
            <h2>{currentPlant} 러닝 기록</h2>
          </div>
          <span className="soft-pill">{logs.length}개 기록</span>
        </div>

        {logs.length > 0 ? (
          <div className="table-list">
            {logs.map((log) => {
              const deleteAction = deleteRunLog.bind(null, log.id, currentPlant);

              return (
                <article key={log.id} className="log-row">
                  <div>
                    <strong>{formatKm(Number(log.distance_km))}</strong>
                    <p>{log.memo || "메모 없음"}</p>
                  </div>
                  <span>{log.duration_min ? `${log.duration_min}분` : "시간 미입력"}</span>
                  <span>{formatDate(log.created_at)}</span>
                  <form action={deleteAction}>
                    <button className="danger-icon" type="submit" title="기록 삭제">
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">{currentPlant}에 반영된 러닝 기록이 없습니다.</div>
        )}
      </section>
    </main>
  );
}
