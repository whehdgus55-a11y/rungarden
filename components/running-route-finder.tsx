"use client";

import { ExternalLink, Loader2, MapPin, Navigation, Search } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type SearchPoint = {
  lat: number;
  lon: number;
  label: string;
};

type OSMElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
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

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const SEARCH_RADIUS_M = 2500;

function distanceMeters(from: SearchPoint, to: Pick<SearchPoint, "lat" | "lon">) {
  const earthRadius = 6371000;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLon = ((to.lon - from.lon) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }

  return `${Math.round(meters)}m`;
}

function routeKind(tags: Record<string, string>) {
  if (tags.leisure === "track") {
    return "운동장 트랙";
  }

  if (tags.leisure === "park" || tags.landuse === "recreation_ground") {
    return "공원 러닝";
  }

  if (tags.route === "running") {
    return "러닝 루트";
  }

  if (tags.route === "hiking" || tags.route === "foot") {
    return "산책·조깅 루트";
  }

  if (tags.highway === "cycleway") {
    return "자전거·러닝길";
  }

  return "보행 러닝길";
}

function routeDetail(tags: Record<string, string>) {
  const details = [tags.surface, tags.lit === "yes" ? "조명 있음" : "", tags.length || tags.distance || ""].filter(Boolean);
  return details.length > 0 ? details.join(" · ") : "가볍게 달리기 좋은 근처 경로";
}

function elementPoint(element: OSMElement) {
  if (element.center) {
    return element.center;
  }

  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { lat: element.lat, lon: element.lon };
  }

  return null;
}

function overpassQuery(point: SearchPoint) {
  return `
    [out:json][timeout:18];
    (
      way(around:${SEARCH_RADIUS_M},${point.lat},${point.lon})["leisure"~"^(park|track)$"]["name"];
      way(around:${SEARCH_RADIUS_M},${point.lat},${point.lon})["landuse"="recreation_ground"]["name"];
      way(around:${SEARCH_RADIUS_M},${point.lat},${point.lon})["highway"~"^(footway|path|pedestrian|cycleway)$"]["name"];
      relation(around:${SEARCH_RADIUS_M},${point.lat},${point.lon})["route"~"^(running|hiking|foot)$"]["name"];
    );
    out center tags 24;
  `;
}

async function findRoutes(point: SearchPoint) {
  const body = new URLSearchParams({ data: overpassQuery(point) });
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    body,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    }
  });

  if (!response.ok) {
    throw new Error("근처 러닝코스를 불러오지 못했습니다.");
  }

  const data = (await response.json()) as { elements?: OSMElement[] };
  const seen = new Set<string>();

  return (data.elements ?? [])
    .map((element) => {
      const pointOnMap = elementPoint(element);
      const tags = element.tags ?? {};
      const name = tags.name || tags["name:ko"] || tags["name:en"];

      if (!pointOnMap || !name) {
        return null;
      }

      const key = `${name}-${Math.round(pointOnMap.lat * 10000)}-${Math.round(pointOnMap.lon * 10000)}`;

      if (seen.has(key)) {
        return null;
      }

      seen.add(key);

      return {
        id: `${element.type}-${element.id}`,
        name,
        kind: routeKind(tags),
        detail: routeDetail(tags),
        lat: pointOnMap.lat,
        lon: pointOnMap.lon,
        distanceM: distanceMeters(point, pointOnMap),
        osmUrl: `https://www.openstreetmap.org/?mlat=${pointOnMap.lat}&mlon=${pointOnMap.lon}#map=16/${pointOnMap.lat}/${pointOnMap.lon}`
      };
    })
    .filter((route): route is RouteCandidate => Boolean(route))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 6);
}

async function searchPlace(query: string): Promise<SearchPoint> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1"
  });
  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("검색 위치를 찾지 못했습니다.");
  }

  const data = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  const result = data[0];

  if (!result) {
    throw new Error("검색 결과가 없습니다.");
  }

  return {
    lat: Number(result.lat),
    lon: Number(result.lon),
    label: result.display_name
  };
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

  async function loadRoutes(nextPoint: SearchPoint) {
    setIsLoading(true);
    setStatus("근처 공원, 트랙, 보행길을 찾는 중입니다.");

    try {
      const nextRoutes = await findRoutes(nextPoint);
      setPoint(nextPoint);
      setRoutes(nextRoutes);
      setStatus(
        nextRoutes.length > 0
          ? `${formatDistance(SEARCH_RADIUS_M)} 안에서 ${nextRoutes.length}개 코스를 찾았습니다.`
          : "근처에 이름이 등록된 러닝코스를 찾지 못했습니다. 검색 범위를 바꿔보세요."
      );
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

    setIsLoading(true);
    setStatus("검색 위치를 찾는 중입니다.");

    try {
      const nextPoint = await searchPlace(trimmed);
      await loadRoutes(nextPoint);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "검색 위치를 찾지 못했습니다.");
      setRoutes([]);
      setIsLoading(false);
    }
  }

  async function handleCurrentLocation() {
    setIsLoading(true);
    setStatus("현재 위치를 확인하는 중입니다.");

    try {
      const nextPoint = await currentPosition();
      await loadRoutes(nextPoint);
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
