import type { RunLog } from "@/lib/types";

export const PLANTS = [
  {
    name: "바질",
    subtitle: "짧은 러닝에도 잘 자라는 허브",
    color: "#2f7d4b",
    requirement: "누적 20km 성장 완료"
  },
  {
    name: "방울토마토",
    subtitle: "꾸준한 거리 누적이 필요한 열매채소",
    color: "#d95d4c",
    requirement: "누적 24km 성장 완료"
  },
  {
    name: "상추",
    subtitle: "매일 관리하기 좋은 잎채소",
    color: "#7aa63f",
    requirement: "누적 18km 성장 완료"
  },
  {
    name: "딸기",
    subtitle: "긴 러닝 미션에 어울리는 보상 식물",
    color: "#c84f65",
    requirement: "누적 28km 성장 완료"
  }
] as const;

export type PlantName = (typeof PLANTS)[number]["name"];

export function isPlantName(value: string): value is PlantName {
  return PLANTS.some((plant) => plant.name === value);
}

export function growthGoalForPlant(plantName: string) {
  if (plantName === "상추") {
    return 18;
  }

  if (plantName === "방울토마토") {
    return 24;
  }

  if (plantName === "딸기") {
    return 28;
  }

  return 20;
}

export function calculateTotalDistance(logs: Pick<RunLog, "distance_km">[]) {
  return logs.reduce((sum, log) => sum + Number(log.distance_km || 0), 0);
}

export function calculateGrowth(totalDistance: number, plantName: string) {
  const goal = growthGoalForPlant(plantName);
  return Math.min(100, Math.round((totalDistance / goal) * 100));
}

export function growthStage(growthPercent: number) {
  if (growthPercent >= 100) {
    return "수확 준비";
  }

  if (growthPercent >= 70) {
    return "꽃과 열매";
  }

  if (growthPercent >= 40) {
    return "잎 성장";
  }

  if (growthPercent >= 15) {
    return "새싹";
  }

  return "씨앗";
}

export function formatKm(value: number) {
  return `${value.toFixed(1)} km`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
