import { openDB } from "idb";
import { z } from "zod";
import {
  RESERVED_PARENT_PIN,
  seedState,
  type AppState,
  type FamilyData,
} from "./domain";
import { DEFAULT_PET, findPet, isPetUnlocked } from "./pets";

const STORAGE_KEY = "family_pets_app_state_v1";
export const CURRENT_SCHEMA_VERSION = 3;

const petIdSchema = z.enum(["tuantuan", "paopao", "meimei", "xingya", "mili"]);
const childSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    avatar: z.string(),
    currentPetId: petIdSchema,
    currentPetName: z.string(),
  })
  .strict();
const legacyChildSchema = childSchema.extend({ currentPetId: z.string().optional() });
const progressSchema = z
  .object({
    level: z.number().int().min(1),
    growthValue: z.number().min(0),
    growthTarget: z.number().positive(),
    totalGrowthValue: z.number().min(0),
    moodValue: z.number().min(0).max(100),
    energyValue: z.number().min(0).max(100),
    pointsBalance: z.number().min(0),
    frozenPoints: z.number().min(0),
    updatedAt: z.string(),
  })
  .strict();
const taskTemplateSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    pointsReward: z.number().min(0),
    growthReward: z.number().min(0),
    recurrence: z.string(),
    active: z.boolean(),
    archived: z.boolean().optional(),
  })
  .strict();
const taskCompletionSchema = z
  .object({
    id: z.string(),
    taskTemplateId: z.string(),
    dateKey: z.string(),
    status: z.enum(["pending_review", "approved", "rejected"]),
    submittedAt: z.string(),
    reviewedAt: z.string().optional(),
    parentNote: z.string().optional(),
    bonusPoints: z.number(),
    bonusGrowthValue: z.number(),
  })
  .strict();
const rewardSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    pointsCost: z.number().min(0),
    available: z.boolean(),
    archived: z.boolean().optional(),
  })
  .strict();
const redemptionSchema = z
  .object({
    id: z.string(),
    rewardId: z.string(),
    pointsCost: z.number().min(0),
    status: z.enum(["pending", "approved", "rejected"]),
    requestedAt: z.string(),
    reviewedAt: z.string().optional(),
    parentNote: z.string().optional(),
    fulfilledAt: z.string().optional(),
  })
  .strict();
const ledgerEntrySchema = z
  .object({
    id: z.string(),
    type: z.enum([
      "task_reward",
      "bonus_reward",
      "redemption_freeze",
      "redemption_deduct",
      "redemption_return",
    ]),
    amount: z.number(),
    balanceAfter: z.number(),
    reason: z.string(),
    createdAt: z.string(),
    approvedByParent: z.boolean(),
  })
  .strict();

const familyDataShape = {
  child: childSchema,
  progress: progressSchema,
  taskTemplates: z.array(taskTemplateSchema),
  taskCompletions: z.array(taskCompletionSchema),
  rewards: z.array(rewardSchema),
  redemptions: z.array(redemptionSchema),
  ledger: z.array(ledgerEntrySchema),
};
const familyDataSchema = z.object(familyDataShape).strict();
const appStateSchema = z
  .object({
    setupCompleted: z.boolean(),
    ...familyDataShape,
    parentPin: z.string().regex(/^\d{4}$/),
  })
  .strict();
const legacyStateSchema = z
  .object({
    setupCompleted: z.boolean().optional(),
    ...familyDataShape,
    child: legacyChildSchema,
    parentPin: z.string().regex(/^\d{4}$/),
  })
  .strict();
const envelopeSchema = z
  .object({
    schemaVersion: z.number().int(),
    savedAt: z.string().optional(),
    exportedAt: z.string().optional(),
    state: z.unknown(),
  })
  .strict();

type LegacyState = z.infer<typeof legacyStateSchema>;

export interface BackupSummary {
  exportedAt: string | null;
  childName: string;
  level: number;
  points: number;
  taskCount: number;
  rewardCount: number;
  historyCount: number;
}

export interface BackupCandidate {
  exportedAt: string | null;
  state: FamilyData;
  summary: BackupSummary;
}

const dbPromise = openDB("family-pets", 3, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("app")) db.createObjectStore("app");
  },
});

function normalizeSelectedPet<T extends LegacyState | AppState>(candidate: T): AppState {
  const requestedPet = findPet(candidate.child.currentPetId);
  const selectedPet =
    requestedPet && isPetUnlocked(requestedPet, candidate.progress.level)
      ? requestedPet
      : DEFAULT_PET;
  const keepExistingName =
    !candidate.child.currentPetId || requestedPet?.id === selectedPet.id;

  return appStateSchema.parse({
    ...candidate,
    setupCompleted:
      candidate.parentPin !== RESERVED_PARENT_PIN &&
      (candidate.setupCompleted ?? true),
    child: {
      ...candidate.child,
      currentPetId: selectedPet.id,
      currentPetName:
        keepExistingName && candidate.child.currentPetName.trim()
          ? candidate.child.currentPetName
          : selectedPet.name,
    },
  });
}

function parseVersionedState(schemaVersion: number, rawState: unknown): AppState {
  if (schemaVersion === CURRENT_SCHEMA_VERSION) {
    return normalizeSelectedPet(appStateSchema.parse(rawState));
  }
  if (schemaVersion === 1 || schemaVersion === 2) {
    return normalizeSelectedPet(legacyStateSchema.parse(rawState));
  }
  throw new Error("不支持的数据版本");
}

async function writeState(state: AppState) {
  const validated = appStateSchema.parse(state);
  await (
    await dbPromise
  ).put(
    "app",
    {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      state: validated,
    },
    STORAGE_KEY,
  );
}

function parseBackupJson(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("备份文件不是有效 JSON");
  }
  const envelope = envelopeSchema.safeParse(parsed);
  if (!envelope.success) throw new Error("备份文件格式不正确");
  return envelope.data;
}

function toFamilyData(state: AppState): FamilyData {
  const { parentPin: _parentPin, setupCompleted: _setupCompleted, ...family } = state;
  return familyDataSchema.parse(family);
}

export function previewBackup(raw: string): BackupCandidate {
  const envelope = parseBackupJson(raw);
  let family: FamilyData;

  try {
    if (envelope.schemaVersion === CURRENT_SCHEMA_VERSION) {
      family = familyDataSchema.parse(envelope.state);
    } else {
      family = toFamilyData(
        parseVersionedState(envelope.schemaVersion, envelope.state),
      );
    }
  } catch (cause) {
    if (cause instanceof Error && cause.message === "不支持的数据版本")
      throw cause;
    throw new Error("备份文件字段不完整");
  }

  const normalized = toFamilyData(
    normalizeSelectedPet({
      ...family,
      setupCompleted: true,
      parentPin: "0000",
    }),
  );
  const summary: BackupSummary = {
    exportedAt: envelope.exportedAt ?? null,
    childName: normalized.child.name,
    level: normalized.progress.level,
    points: normalized.progress.pointsBalance,
    taskCount: normalized.taskTemplates.length,
    rewardCount: normalized.rewards.length,
    historyCount:
      normalized.taskCompletions.length +
      normalized.redemptions.length +
      normalized.ledger.length,
  };
  return { exportedAt: summary.exportedAt, state: normalized, summary };
}

export const appRepository = {
  async load(): Promise<AppState> {
    const saved = await (await dbPromise).get("app", STORAGE_KEY);
    if (!saved) return seedState();
    const envelope = envelopeSchema.safeParse(saved);
    if (!envelope.success) return seedState();
    try {
      const state = parseVersionedState(
        envelope.data.schemaVersion,
        envelope.data.state,
      );
      if (envelope.data.schemaVersion !== CURRENT_SCHEMA_VERSION)
        await writeState(state);
      return state;
    } catch {
      return seedState();
    }
  },
  async save(state: AppState) {
    await writeState(state);
  },
  previewBackup,
  export(state: AppState) {
    return JSON.stringify(
      {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        state: toFamilyData(state),
      },
      null,
      2,
    );
  },
};
