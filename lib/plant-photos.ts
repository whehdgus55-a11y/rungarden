import type { PlantName } from "@/lib/rungarden";

type GrowthStageKey = "seed" | "sprout" | "leaf" | "fruit" | "harvest";

type PlantPhoto = {
  src: string;
  source: string;
  credit: string;
};

function commonsFilePath(fileName: string) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=900`;
}

const basilSeedling = {
  src: commonsFilePath("Young basil plant.JPG"),
  source: "https://commons.wikimedia.org/wiki/File:Young_basil_plant.JPG",
  credit: "Pixelmaniac pictures, CC0"
};

const basilLeaves = {
  src: commonsFilePath("Ocimum basilicum-001.jpg"),
  source: "https://commons.wikimedia.org/wiki/File:Ocimum_basilicum-001.jpg",
  credit: "Amada44, Public domain"
};

const tomatoSeedling = {
  src: commonsFilePath("Germinating tomatoes.jpg"),
  source: "https://commons.wikimedia.org/wiki/File:Germinating_tomatoes.jpg",
  credit: "Dennis Brown, CC BY-SA 3.0"
};

const tomatoFruit = {
  src: commonsFilePath("Tomato Plant.jpg"),
  source: "https://commons.wikimedia.org/wiki/File:Tomato_Plant.jpg",
  credit: "Nidhin Murali, CC BY-SA 4.0"
};

const tomatoHarvest = {
  src: commonsFilePath("Vegetable tomatoes.jpg"),
  source: "https://commons.wikimedia.org/wiki/File:Vegetable_tomatoes.jpg",
  credit: "Leon Brooks, Public domain"
};

const lettuceSeedling = {
  src: commonsFilePath("Lactuca sativa 2016-10-30 4778.jpg"),
  source: "https://commons.wikimedia.org/wiki/File:Lactuca_sativa_2016-10-30_4778.jpg",
  credit: "AnRo0002, CC0"
};

const lettuceHead = {
  src: commonsFilePath("Lactuca sativa 02.JPG"),
  source: "https://commons.wikimedia.org/wiki/File:Lactuca_sativa_02.JPG",
  credit: "AfroBrazilian, CC BY-SA 3.0"
};

const strawberryPlant = {
  src: commonsFilePath("Strawberry Plant with Fruit (close-up) - 49806018238.jpg"),
  source: "https://commons.wikimedia.org/wiki/File:Strawberry_Plant_with_Fruit_(close-up)_-_49806018238.jpg",
  credit: "Alabama Extension, CC0"
};

const strawberryHarvest = {
  src: commonsFilePath("Strawberries.JPG"),
  source: "https://commons.wikimedia.org/wiki/File:Strawberries.JPG",
  credit: "Wikimedia Commons, CC BY-SA"
};

export const PLANT_PHOTOS: Record<PlantName, Record<GrowthStageKey, PlantPhoto>> = {
  바질: {
    seed: basilSeedling,
    sprout: basilSeedling,
    leaf: basilLeaves,
    fruit: basilLeaves,
    harvest: basilLeaves
  },
  방울토마토: {
    seed: tomatoSeedling,
    sprout: tomatoSeedling,
    leaf: tomatoFruit,
    fruit: tomatoFruit,
    harvest: tomatoHarvest
  },
  상추: {
    seed: lettuceSeedling,
    sprout: lettuceSeedling,
    leaf: lettuceHead,
    fruit: lettuceHead,
    harvest: lettuceHead
  },
  딸기: {
    seed: strawberryPlant,
    sprout: strawberryPlant,
    leaf: strawberryPlant,
    fruit: strawberryPlant,
    harvest: strawberryHarvest
  }
};

export function growthStageKey(growthPercent: number): GrowthStageKey {
  if (growthPercent >= 100) {
    return "harvest";
  }

  if (growthPercent >= 70) {
    return "fruit";
  }

  if (growthPercent >= 40) {
    return "leaf";
  }

  if (growthPercent >= 15) {
    return "sprout";
  }

  return "seed";
}

export function photoForPlantStage(plantName: PlantName, growthPercent: number) {
  return PLANT_PHOTOS[plantName][growthStageKey(growthPercent)];
}

export function coverPhotoForPlant(plantName: PlantName) {
  return PLANT_PHOTOS[plantName].harvest;
}
