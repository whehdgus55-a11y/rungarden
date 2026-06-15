import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

type RequestBody = {
  query?: unknown;
  lat?: unknown;
  lon?: unknown;
  label?: unknown;
};

type NominatimResult = {
  place_id?: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  class?: string;
  type?: string;
};

type NearbySearch = {
  query: string;
  kind: string;
  detail: string;
};

type RouteLookupResult = {
  routes: RouteCandidate[];
  source: "nominatim" | "overpass" | "combined";
};

const SEARCH_RADIUS_M = 2500;
const NEARBY_SEARCH_RADIUS_M = 3500;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter"
];
const NOMINATIM_TIMEOUT_MS = 5000;
const NOMINATIM_ROUTE_TIMEOUT_MS = 4000;
const OVERPASS_TIMEOUT_MS = 7000;
const NEARBY_SEARCHES: NearbySearch[] = [
  {
    query: "park",
    kind: "공원 러닝",
    detail: "가볍게 조깅하거나 회복주로 활용하기 좋은 공원 코스"
  },
  {
    query: "running track",
    kind: "러닝 트랙",
    detail: "페이스 훈련과 인터벌 러닝에 어울리는 트랙 코스"
  },
  {
    query: "stadium",
    kind: "운동장 코스",
    detail: "반복 주행과 기록 측정에 활용하기 좋은 운동장 주변 코스"
  },
  {
    query: "trail",
    kind: "트레일 코스",
    detail: "걷기와 조깅을 섞어 달리기 좋은 녹지형 코스"
  }
];

class RouteApiError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

function baseHeaders() {
  return {
    Accept: "application/json",
    Referer: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "User-Agent": "RunGarden/1.0 (student project; https://github.com/whehdgus55-a11y/rungarden)"
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 14000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

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

function elementPoint(element: OSMElement) {
  if (element.center) {
    return element.center;
  }

  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { lat: element.lat, lon: element.lon };
  }

  return null;
}

function routeKind(tags: Record<string, string>) {
  if (tags.leisure === "track") {
    return "러닝 트랙";
  }

  if (tags.leisure === "park" || tags.landuse === "recreation_ground") {
    return "공원 산책로";
  }

  if (tags.route === "running") {
    return "러닝 루트";
  }

  if (tags.route === "hiking" || tags.route === "foot") {
    return "걷기/트레일 루트";
  }

  if (tags.highway === "cycleway") {
    return "자전거/보행 겸용";
  }

  return "보행 코스";
}

function routeDetail(tags: Record<string, string>) {
  const details = [
    tags.surface ? `노면 ${tags.surface}` : "",
    tags.lit === "yes" ? "야간 조명 있음" : "",
    tags.length || tags.distance ? `길이 ${tags.length || tags.distance}` : ""
  ].filter(Boolean);

  return details.length > 0 ? details.join(" · ") : "가볍게 달리기 좋은 근처 경로";
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

function parseRoutes(point: SearchPoint, elements: OSMElement[] = []) {
  const seen = new Set<string>();

  return elements
    .map((element) => {
      const pointOnMap = elementPoint(element);
      const tags = element.tags ?? {};
      const name = tags["name:ko"] || tags.name || tags["name:en"];

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

function routeNameFromPlace(place: NominatimResult) {
  return place.name || place.display_name.split(",")[0]?.trim() || "추천 러닝코스";
}

function routeKindFromPlace(place: NominatimResult, fallbackKind: string) {
  if (place.type === "track") {
    return "러닝 트랙";
  }

  if (place.type === "stadium" || place.type === "sports_centre" || place.class === "leisure") {
    return fallbackKind;
  }

  if (place.type === "park" || place.type === "garden") {
    return "공원 러닝";
  }

  return fallbackKind;
}

function viewboxForPoint(point: SearchPoint, radiusM = NEARBY_SEARCH_RADIUS_M) {
  const latDelta = radiusM / 111320;
  const lonDelta = radiusM / (111320 * Math.max(Math.cos((point.lat * Math.PI) / 180), 0.2));
  const left = point.lon - lonDelta;
  const right = point.lon + lonDelta;
  const top = point.lat + latDelta;
  const bottom = point.lat - latDelta;

  return `${left},${top},${right},${bottom}`;
}

function mergeRoutes(routes: RouteCandidate[]) {
  const seen = new Set<string>();

  return routes
    .filter((route) => {
      const key = `${route.name}-${Math.round(route.lat * 10000)}-${Math.round(route.lon * 10000)}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 6);
}

function fallbackRoutes(point: SearchPoint): RouteCandidate[] {
  const candidates = [
    {
      id: "fallback-easy",
      name: "2km 이지런 루프",
      kind: "가벼운 러닝",
      detail: "주변 보행로와 공원길을 확인하며 천천히 달리는 회복 코스",
      lat: point.lat + 0.0025,
      lon: point.lon + 0.002
    },
    {
      id: "fallback-tempo",
      name: "3~4km 템포런 코스",
      kind: "페이스 훈련",
      detail: "직선 보행로와 완만한 길을 찾아 일정한 페이스로 달리는 코스",
      lat: point.lat - 0.003,
      lon: point.lon + 0.0035
    },
    {
      id: "fallback-long",
      name: "5km 정원 성장런",
      kind: "장거리 조깅",
      detail: "식물 성장 기록에 반영하기 좋은 여유 있는 거리의 추천 코스",
      lat: point.lat + 0.0045,
      lon: point.lon - 0.003
    }
  ];

  return candidates.map((candidate) => ({
    ...candidate,
    distanceM: distanceMeters(point, candidate),
    osmUrl: `https://www.openstreetmap.org/?mlat=${candidate.lat}&mlon=${candidate.lon}#map=15/${point.lat}/${point.lon}`
  }));
}

async function searchPlace(query: string): Promise<SearchPoint> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1"
  });

  const response = await fetchWithTimeout(
    `${NOMINATIM_URL}?${params.toString()}`,
    {
      headers: baseHeaders()
    },
    NOMINATIM_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new RouteApiError("검색 위치를 찾는 중 지도 API 응답이 불안정합니다.", 502);
  }

  const data = (await response.json()) as NominatimResult[];
  const result = data[0];

  if (!result) {
    throw new RouteApiError("검색 결과가 없습니다. 학교명, 동네명, 역 이름처럼 조금 더 구체적으로 입력해 보세요.", 404);
  }

  return {
    lat: Number(result.lat),
    lon: Number(result.lon),
    label: result.display_name
  };
}

async function searchNearbyWithNominatim(point: SearchPoint, search: NearbySearch) {
  const params = new URLSearchParams({
    q: search.query,
    format: "jsonv2",
    limit: "5",
    bounded: "1",
    viewbox: viewboxForPoint(point)
  });

  const response = await fetchWithTimeout(
    `${NOMINATIM_URL}?${params.toString()}`,
    {
      headers: baseHeaders()
    },
    NOMINATIM_ROUTE_TIMEOUT_MS
  );

  if (!response.ok) {
    return [];
  }

  const places = (await response.json()) as NominatimResult[];

  return places
    .map((place) => {
      const lat = Number(place.lat);
      const lon = Number(place.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      return {
        id: `nominatim-${place.place_id ?? `${search.query}-${lat}-${lon}`}`,
        name: routeNameFromPlace(place),
        kind: routeKindFromPlace(place, search.kind),
        detail: search.detail,
        lat,
        lon,
        distanceM: distanceMeters(point, { lat, lon }),
        osmUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
      };
    })
    .filter((route): route is RouteCandidate => Boolean(route))
    .filter((route) => route.distanceM <= NEARBY_SEARCH_RADIUS_M);
}

async function findNominatimRoutes(point: SearchPoint) {
  const routes: RouteCandidate[] = [];

  for (const search of NEARBY_SEARCHES) {
    try {
      routes.push(...(await searchNearbyWithNominatim(point, search)));
    } catch (error) {
      console.error("[running-routes] nominatim nearby failed", error);
    }

    if (mergeRoutes(routes).length >= 4) {
      break;
    }
  }

  return mergeRoutes(routes);
}

async function findRoutesFromEndpoint(endpoint: string, body: string, point: SearchPoint) {
  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      body,
      headers: {
        ...baseHeaders(),
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      }
    },
    OVERPASS_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(`Overpass ${response.status}`);
  }

  const data = (await response.json()) as { elements?: OSMElement[] };
  return parseRoutes(point, data.elements);
}

async function findRoutes(point: SearchPoint): Promise<RouteLookupResult> {
  const nearbyRoutes = await findNominatimRoutes(point);

  if (nearbyRoutes.length >= 3) {
    return {
      routes: nearbyRoutes,
      source: "nominatim"
    };
  }

  const body = new URLSearchParams({ data: overpassQuery(point) }).toString();

  try {
    const overpassRoutes = await Promise.any(OVERPASS_ENDPOINTS.map((endpoint) => findRoutesFromEndpoint(endpoint, body, point)));
    const routes = mergeRoutes([...nearbyRoutes, ...overpassRoutes]);

    if (routes.length > 0) {
      return {
        routes,
        source: nearbyRoutes.length > 0 ? "combined" : "overpass"
      };
    }
  } catch (error) {
    console.error("[running-routes] overpass failed", error);
  }

  if (nearbyRoutes.length > 0) {
    return {
      routes: nearbyRoutes,
      source: "nominatim"
    };
  }

  throw new RouteApiError("외부 지도 API 응답이 불안정합니다. 잠시 뒤 다시 시도해 주세요.", 502);
}

function validatePoint(lat: number, lon: number, label: string): SearchPoint {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new RouteApiError("위치 좌표가 올바르지 않습니다.", 400);
  }

  return {
    lat,
    lon,
    label: label.trim().slice(0, 120) || "현재 위치"
  };
}

async function resolvePoint(body: RequestBody): Promise<SearchPoint> {
  const query = typeof body.query === "string" ? body.query.trim() : "";

  if (query) {
    return searchPlace(query.slice(0, 80));
  }

  const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
  const lon = typeof body.lon === "number" ? body.lon : Number(body.lon);
  const label = typeof body.label === "string" ? body.label : "현재 위치";

  return validatePoint(lat, lon, label);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const point = await resolvePoint(body);
    let routes: RouteCandidate[];
    let message: string;

    try {
      const result = await findRoutes(point);
      routes = result.routes;
      message =
        result.source === "overpass"
          ? `2.5km 안에서 ${routes.length}개 코스를 찾았습니다.`
          : `근처 공원과 운동장 기준으로 ${routes.length}개 코스를 찾았습니다.`;
    } catch (error) {
      if (!(error instanceof RouteApiError) || error.status !== 502) {
        throw error;
      }

      routes = fallbackRoutes(point);
      message = "검색 위치를 기준으로 기본 추천 코스를 구성했습니다.";
    }

    if (routes.length === 0) {
      routes = fallbackRoutes(point);
      message = "검색 위치를 기준으로 기본 추천 코스를 구성했습니다.";
    }

    return NextResponse.json({ point, routes, message });
  } catch (error) {
    const status = error instanceof RouteApiError ? error.status : 502;
    const message =
      error instanceof Error ? error.message : "러닝코스를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.";

    return NextResponse.json({ error: message }, { status });
  }
}
