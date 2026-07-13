import { openDB } from "idb";
import type { AppState } from "./domain";
import { seedState } from "./domain";
import { DEFAULT_PET, findPet, isPetUnlocked } from "./pets";

const STORAGE_KEY = "family_pets_app_state_v1";
const SCHEMA_VERSION = 2;

type StoredState = Omit<AppState, "child"> & {
  child: Omit<AppState["child"], "currentPetId"> & {
    currentPetId?: string;
  };
};

interface PersistedData {
  schemaVersion: number;
  state: StoredState;
}

const dbPromise = openDB("family-pets", 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("app")) db.createObjectStore("app");
  },
});

async function writeState(state: AppState) {
  await (
    await dbPromise
  ).put(
    "app",
    { schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), state },
    STORAGE_KEY,
  );
}

export function normalizeAppState(candidate: StoredState): AppState {
  const requestedPet = findPet(candidate.child.currentPetId);
  const selectedPet =
    requestedPet && isPetUnlocked(requestedPet, candidate.progress.level)
      ? requestedPet
      : DEFAULT_PET;
  const keepExistingName =
    !candidate.child.currentPetId || requestedPet?.id === selectedPet.id;

  return {
    ...candidate,
    child: {
      ...candidate.child,
      currentPetId: selectedPet.id,
      currentPetName:
        keepExistingName && candidate.child.currentPetName.trim()
          ? candidate.child.currentPetName
          : selectedPet.name,
    },
  };
}

export const appRepository = {
  async load(): Promise<AppState> {
    const saved = (await (await dbPromise).get(
      "app",
      STORAGE_KEY,
    )) as PersistedData | undefined;
    if (!saved || ![1, SCHEMA_VERSION].includes(saved.schemaVersion)) {
      return seedState();
    }
    const state = normalizeAppState(saved.state);
    if (saved.schemaVersion !== SCHEMA_VERSION) await writeState(state);
    return state;
  },
  async save(state: AppState) {
    await writeState(state);
  },
  async restore(raw: string): Promise<AppState> {
    let parsed: { schemaVersion?: number; state?: Partial<AppState> };
    try {
      parsed = JSON.parse(raw) as {
        schemaVersion?: number;
        state?: Partial<AppState>;
      };
    } catch {
      throw new Error("备份文件不是有效 JSON");
    }
    const candidate = parsed.state;
    if (
      ![1, SCHEMA_VERSION].includes(parsed.schemaVersion ?? 0) ||
      !candidate?.child ||
      !candidate.progress ||
      !Array.isArray(candidate.taskTemplates) ||
      !Array.isArray(candidate.taskCompletions) ||
      !Array.isArray(candidate.rewards) ||
      !Array.isArray(candidate.redemptions) ||
      !Array.isArray(candidate.ledger) ||
      typeof candidate.parentPin !== "string"
    )
      throw new Error("备份文件格式不正确");
    if (
      typeof candidate.child.name !== "string" ||
      typeof candidate.progress.pointsBalance !== "number"
    )
      throw new Error("备份文件字段不完整");
    const state = normalizeAppState(candidate as StoredState);
    await this.save(state);
    return state;
  },
  export(state: AppState) {
    return JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        state,
      },
      null,
      2,
    );
  },
};
