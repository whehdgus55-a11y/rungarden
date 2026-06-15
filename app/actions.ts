"use server";

import { calculateGrowth, calculateTotalDistance, isPlantName } from "@/lib/rungarden";
import { createClient } from "@/lib/supabase/server";
import type { RunLog } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type PlantHarvestState = {
  harvest_count: number | null;
  harvested_distance_km: number | null;
};

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function messageUrl(path: string, key: "message" | "error", message: string) {
  return `${path}?${key}=${encodeURIComponent(message)}`;
}

function dashboardUrl(plantName: string, key: "message" | "error", message: string) {
  return `/datamanagement?plant=${encodeURIComponent(plantName)}&${key}=${encodeURIComponent(message)}`;
}

function roundedKm(value: number) {
  return Number(value.toFixed(2));
}

async function getOrigin() {
  const headerStore = await headers();
  return (
    headerStore.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(messageUrl("/login", "message", "이메일 로그인 후 이용할 수 있습니다."));
  }

  return { supabase, user };
}

async function refreshPlantGrowth(userId: string, plantName: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("run_logs")
    .select("distance_km")
    .eq("user_id", userId)
    .eq("plant_name", plantName);

  if (error) {
    throw error;
  }

  const { data: plantData, error: plantFetchError } = await supabase
    .from("user_plants")
    .select("harvest_count, harvested_distance_km")
    .eq("user_id", userId)
    .eq("plant_name", plantName)
    .maybeSingle();

  if (plantFetchError) {
    throw plantFetchError;
  }

  const plant = plantData as PlantHarvestState | null;
  const totalDistance = calculateTotalDistance((data ?? []) as Pick<RunLog, "distance_km">[]);
  const harvestedDistance = Math.min(Number(plant?.harvested_distance_km ?? 0), totalDistance);
  const distanceAfterHarvest = Math.max(0, totalDistance - harvestedDistance);
  const growthPercent = calculateGrowth(distanceAfterHarvest, plantName);

  const { error: plantError } = await supabase.from("user_plants").upsert(
    {
      user_id: userId,
      plant_name: plantName,
      growth_percent: growthPercent,
      harvest_count: Number(plant?.harvest_count ?? 0),
      harvested_distance_km: roundedKm(harvestedDistance)
    },
    {
      onConflict: "user_id,plant_name"
    }
  );

  if (plantError) {
    throw plantError;
  }
}

export async function signInWithEmail(formData: FormData) {
  const email = textValue(formData, "email").toLowerCase();

  if (!email || !email.includes("@")) {
    redirect(messageUrl("/login", "error", "올바른 이메일을 입력하세요."));
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/datamanagement`
    }
  });

  if (error) {
    redirect(messageUrl("/login", "error", error.message));
  }

  redirect(messageUrl("/login", "message", "로그인 링크를 이메일로 보냈습니다."));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function choosePlant(formData: FormData) {
  const { user } = await requireUser();
  const plantName = textValue(formData, "plant_name");

  if (!isPlantName(plantName)) {
    redirect(messageUrl("/datamanagement", "error", "지원하는 식물을 선택하세요."));
  }

  try {
    await refreshPlantGrowth(user.id, plantName);
  } catch (error) {
    const message = error instanceof Error ? error.message : "식물을 저장할 수 없습니다.";
    redirect(dashboardUrl(plantName, "error", message));
  }

  revalidatePath("/datamanagement");
  redirect(dashboardUrl(plantName, "message", `${plantName} 재배 데이터를 불러왔습니다.`));
}

export async function createRunLog(formData: FormData) {
  const { supabase, user } = await requireUser();
  const distance = Number(textValue(formData, "distance_km"));
  const durationText = textValue(formData, "duration_min");
  const duration = durationText ? Number(durationText) : null;
  const memo = textValue(formData, "memo");
  const plantName = textValue(formData, "plant_name") || "바질";

  if (!Number.isFinite(distance) || distance <= 0 || distance > 100) {
    redirect(dashboardUrl(plantName, "error", "러닝 거리는 0.1km 이상 100km 이하로 입력하세요."));
  }

  if (duration !== null && (!Number.isFinite(duration) || duration <= 0 || duration > 600)) {
    redirect(dashboardUrl(plantName, "error", "운동 시간은 1분 이상 600분 이하로 입력하세요."));
  }

  if (memo.length > 160) {
    redirect(dashboardUrl(plantName, "error", "메모는 160자 이하로 입력하세요."));
  }

  if (!isPlantName(plantName)) {
    redirect(messageUrl("/datamanagement", "error", "지원하는 식물을 선택하세요."));
  }

  try {
    const { error } = await supabase.from("run_logs").insert({
      user_id: user.id,
      plant_name: plantName,
      distance_km: roundedKm(distance),
      duration_min: duration,
      memo: memo || null
    });

    if (error) {
      throw error;
    }

    await refreshPlantGrowth(user.id, plantName);
  } catch (error) {
    const message = error instanceof Error ? error.message : "러닝 기록을 저장할 수 없습니다.";
    redirect(dashboardUrl(plantName, "error", message));
  }

  revalidatePath("/datamanagement");
  redirect(dashboardUrl(plantName, "message", `${plantName} 성장에 러닝 기록이 반영되었습니다.`));
}

export async function harvestPlant(formData: FormData) {
  const { supabase, user } = await requireUser();
  const plantName = textValue(formData, "plant_name") || "바질";

  if (!isPlantName(plantName)) {
    redirect(messageUrl("/datamanagement", "error", "지원하는 식물을 선택하세요."));
  }

  let harvested = false;

  try {
    const { data, error } = await supabase
      .from("run_logs")
      .select("distance_km")
      .eq("user_id", user.id)
      .eq("plant_name", plantName);

    if (error) {
      throw error;
    }

    const { data: plantData, error: plantFetchError } = await supabase
      .from("user_plants")
      .select("harvest_count, harvested_distance_km")
      .eq("user_id", user.id)
      .eq("plant_name", plantName)
      .maybeSingle();

    if (plantFetchError) {
      throw plantFetchError;
    }

    const plant = plantData as PlantHarvestState | null;
    const totalDistance = calculateTotalDistance((data ?? []) as Pick<RunLog, "distance_km">[]);
    const harvestedDistance = Math.min(Number(plant?.harvested_distance_km ?? 0), totalDistance);
    const distanceAfterHarvest = Math.max(0, totalDistance - harvestedDistance);
    const growthPercent = calculateGrowth(distanceAfterHarvest, plantName);

    if (growthPercent >= 100) {
      const { error: updateError } = await supabase.from("user_plants").upsert(
        {
          user_id: user.id,
          plant_name: plantName,
          growth_percent: 0,
          harvest_count: Number(plant?.harvest_count ?? 0) + 1,
          harvested_distance_km: roundedKm(totalDistance)
        },
        {
          onConflict: "user_id,plant_name"
        }
      );

      if (updateError) {
        throw updateError;
      }

      harvested = true;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "식물을 수확할 수 없습니다.";
    redirect(dashboardUrl(plantName, "error", message));
  }

  if (!harvested) {
    redirect(dashboardUrl(plantName, "error", "아직 수확할 수 없습니다. 성장률 100%를 먼저 달성하세요."));
  }

  revalidatePath("/datamanagement");
  redirect(dashboardUrl(plantName, "message", `${plantName}를 수확했습니다. 다음 재배를 시작해요.`));
}

export async function deleteRunLog(logId: string, plantName: string) {
  const { supabase, user } = await requireUser();
  const safePlantName = isPlantName(plantName) ? plantName : "바질";

  try {
    const { error } = await supabase
      .from("run_logs")
      .delete()
      .eq("id", logId)
      .eq("user_id", user.id)
      .eq("plant_name", safePlantName);

    if (error) {
      throw error;
    }

    await refreshPlantGrowth(user.id, safePlantName);
  } catch (error) {
    const message = error instanceof Error ? error.message : "기록을 삭제할 수 없습니다.";
    redirect(dashboardUrl(safePlantName, "error", message));
  }

  revalidatePath("/datamanagement");
  redirect(dashboardUrl(safePlantName, "message", "러닝 기록을 삭제했습니다."));
}
