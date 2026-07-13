export type PetId = "tuantuan" | "paopao" | "meimei" | "xingya" | "mili";
export type PetExpression = "normal" | "happy" | "excited" | "low_energy";

export interface PetDefinition {
  id: PetId;
  name: string;
  species: string;
  description: string;
  traits: readonly string[];
  unlockLevel: number;
  assets: Record<PetExpression, string>;
}

export const PET_CATALOG: readonly PetDefinition[] = [
  {
    id: "tuantuan",
    name: "团团",
    species: "森林幼兽",
    description: "软乎乎的森林伙伴，喜欢阅读和整理好的房间。",
    traits: ["温暖", "爱陪伴"],
    unlockLevel: 1,
    assets: {
      normal: "/assets/pets/tuantuan-normal.png",
      happy: "/assets/pets/tuantuan-happy.png",
      excited: "/assets/pets/tuantuan-excited.png",
      low_energy: "/assets/pets/tuantuan-low-energy.png",
    },
  },
  {
    id: "paopao",
    name: "泡泡",
    species: "云朵猫",
    description: "戴着小鱼铃铛的蓝猫，会把每天的好消息轻轻收好。",
    traits: ["好奇", "细心"],
    unlockLevel: 3,
    assets: {
      normal: "/assets/pets/blue-cat-normal.png",
      happy: "/assets/pets/blue-cat-happy.png",
      excited: "/assets/pets/blue-cat-excited.png",
      low_energy: "/assets/pets/blue-cat-low-energy.png",
    },
  },
  {
    id: "meimei",
    name: "莓莓",
    species: "草莓垂耳兔",
    description: "戴着草莓小礼帽，最喜欢分享拥抱和甜甜的鼓励。",
    traits: ["开朗", "爱分享"],
    unlockLevel: 5,
    assets: {
      normal: "/assets/pets/strawberry-rabbit-normal.png",
      happy: "/assets/pets/strawberry-rabbit-happy.png",
      excited: "/assets/pets/strawberry-rabbit-excited.png",
      low_energy: "/assets/pets/strawberry-rabbit-low-energy.png",
    },
  },
  {
    id: "xingya",
    name: "星芽",
    species: "暖橙小狐",
    description: "围着紫色围巾的小狐狸，眼睛里总藏着亮晶晶的新点子。",
    traits: ["机灵", "有创意"],
    unlockLevel: 7,
    assets: {
      normal: "/assets/pets/orange-fox-normal.png",
      happy: "/assets/pets/orange-fox-happy.png",
      excited: "/assets/pets/orange-fox-excited.png",
      low_energy: "/assets/pets/orange-fox-low-energy.png",
    },
  },
  {
    id: "mili",
    name: "米粒",
    species: "奶油小龙",
    description: "像一团暖暖的奶油云，认真起来会鼓起圆圆的小脸。",
    traits: ["勇敢", "有耐心"],
    unlockLevel: 10,
    assets: {
      normal: "/assets/pets/cream-dragon-normal.png",
      happy: "/assets/pets/cream-dragon-happy.png",
      excited: "/assets/pets/cream-dragon-excited.png",
      low_energy: "/assets/pets/cream-dragon-low-energy.png",
    },
  },
];

export const DEFAULT_PET = PET_CATALOG[0];

export function findPet(petId?: string) {
  return PET_CATALOG.find((pet) => pet.id === petId);
}

export function getPet(petId?: string) {
  return findPet(petId) ?? DEFAULT_PET;
}

export function isPetUnlocked(pet: PetDefinition, level: number) {
  return level >= pet.unlockLevel;
}

export function petsUnlockedAtLevel(level: number) {
  return PET_CATALOG.filter((pet) => isPetUnlocked(pet, level));
}
