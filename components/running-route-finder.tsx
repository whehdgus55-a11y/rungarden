"use client";

import { ExternalLink, Loader2, MapPin, Navigation, Search } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type SearchPoint = {
  lat: number;
  lon: number;
  label: string;
};

type RouteCandidate = {
  id: string;
  name: string;
  kind: string;
  detail: string;
  lat: number;
  lon: number;
  distanceM: number;
  osmUrl: string;
};

type RouteApiResponse = {
  point: SearchPoint;
  routes: RouteCandidate[];
  message: string;
};

type RouteRequest = {
  query?: string;
  lat?: number;
  lon?: number;
  label?: string;
};

function formatDistance(meters: number) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }

  return `${Math.round(meters)}m`;
}

function currentPosition() {
  return new Promise<SearchPoint>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("브라우저가 현재 위치 기능을 지원하지 않습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          label: "현재 위치"
        });
      },
      () => reject(new Error("현재 위치 권한을 허용해야 추천 코스를 찾을 수 있습니다.")),
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000
      }
    );
  });
}

async function requestRoutes(payload: RouteRequest) {
  const response = await fetch("/api/running-routes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = (await response.json().catch(() => null)) as Partial<RouteApiResponse> & { error?: string } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "러닝코스를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }

  if (!data?.point || !Array.isArray(data.routes)) {
    throw new Error("추천 코스 응답이 올바르지 않습니다.");
  }

  return data as RouteApiResponse;
}

export function RunningRouteFinder() {
  const [query, setQuery] = useState("");
  const [point, setPoint] = useState<SearchPoint | null>(null);
  const [routes, setRoutes] = useState<RouteCandidate[]>([]);
  const [status, setStatus] = useState("현재 위치 또는 검색 위치를 기준으로 추천 코스를 찾을 수 있습니다.");
  const [isLoading, setIsLoading] = useState(false);

  const heading = useMemo(() => {
    if (!point) {
      return "러닝코스 추천";
    }

    return `${point.label.split(",")[0]} 근처 러닝코스`;
  }, [point]);

  async function loadRoutes(payload: RouteRequest, pendingMessage: string) {
    setIsLoading(true);
    setStatus(pendingMessage);

    try {
      const result = await requestRoutes(payload);
      setPoint(result.point);
      setRoutes(result.routes);
      setStatus(result.message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "러닝코스를 불러오지 못했습니다.");
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) {
      setStatus("검색할 장소명을 입력하세요.");
      return;
    }

    await loadRoutes({ query: trimmed }, "검색 위치를 기준으로 코스를 찾는 중입니다.");
  }

  async function handleCurrentLocation() {
    setIsLoading(true);
    setStatus("현재 위치를 확인하는 중입니다.");

    try {
      const nextPoint = await currentPosition();
      await loadRoutes(
        {
          lat: nextPoint.lat,
          lon: nextPoint.lon,
          label: nextPoint.label
        },
        "현재 위치 주변 코스를 찾는 중입니다."
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "현재 위치를 확인하지 못했습니다.");
      setRoutes([]);
      setIsLoading(false);
    }
  }

  return (
    <section className="panel route-panel">
      <div className="panel-heading inline">
        <div>
          <p className="eyebrow">RUN ROUTE</p>
          <h2>{heading}</h2>
        </div>
        <button className="icon-text-button" type="button" onClick={handleCurrentLocation} disabled={isLoading}>
          <Navigation size={17} aria-hidden="true" />
          현재 위치
        </button>
      </div>

      <form className="route-search" onSubmit={handleSearch}>
        <label>
          <span>장소 검색</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 충남대학교, 대전 유성구"
            maxLength={80}
          />
        </label>
        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="spin-icon" size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
          코스 찾기
        </button>
      </form>

      <div className="route-status">
        <MapPin size={17} aria-hidden="true" />
        <span>{status}</span>
      </div>

      {routes.length > 0 ? (
        <div className="route-grid">
          {routes.map((route) => (
            <article className="route-card" key={route.id}>
              <div>
                <span>{route.kind}</span>
                <h3>{route.name}</h3>
                <p>{route.detail}</p>
              </div>
              <div className="route-card-foot">
                <strong>{formatDistance(route.distanceM)} 거리</strong>
                <a href={route.osmUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} aria-hidden="true" />
                  지도
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <p className="route-credit">
        지도 데이터: OpenStreetMap contributors · 위치 검색: Nominatim · 코스 검색: Overpass API
      </p>
    </section>
  );
}
