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
export const CURRENT_SCHEMA_VERSION = 4;

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
const legacyLedgerTypeSchema = z.enum([
  "task_reward",
  "bonus_reward",
  "redemption_freeze",
  "redemption_deduct",
  "redemption_return",
]);
const ledgerTypeSchema = z.enum([
  ...legacyLedgerTypeSchema.options,
  "milestone_reward",
]);
const createLedgerEntrySchema = (type: typeof ledgerTypeSchema | typeof legacyLedgerTypeSchema) =>
  z
  .object({
    id: z.string(),
    type,
    amount: z.number(),
    balanceAfter: z.number(),
    reason: z.string(),
    createdAt: z.string(),
    approvedByParent: z.boolean(),
  })
  .strict();
const ledgerEntrySchema = createLedgerEntrySchema(ledgerTypeSchema);
const legacyLedgerEntrySchema = createLedgerEntrySchema(legacyLedgerTypeSchema);
const levelMilestoneIdSchema = z.enum([
  "level-2",
  "level-3",
  "level-5",
  "level-7",
  "level-10",
]);
const companionRewardIdSchema = z.enum(["streak-3", "streak-7", "streak-14"]);
const uniqueArray = <T extends z.ZodType>(schema: T) =>
  z.array(schema).refine((items) => new Set(items).size === items.length, {
    message: "领取记录不能重复",
  });

const legacyFamilyDataShape = {
  child: childSchema,
  progress: progressSchema,
  taskTemplates: z.array(taskTemplateSchema),
  taskCompletions: z.array(taskCompletionSchema),
  rewards: z.array(rewardSchema),
  redemptions: z.array(redemptionSchema),
  ledger: z.array(legacyLedgerEntrySchema),
};
const familyDataShape = {
  ...legacyFamilyDataShape,
  ledger: z.array(ledgerEntrySchema),
  claimedLevelMilestones: uniqueArray(levelMilestoneIdSchema),
  claimedCompanionRewards: uniqueArray(companionRewardIdSchema),
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
    ...legacyFamilyDataShape,
    child: legacyChildSchema,
    parentPin: z.string().regex(/^\d{4}$/),
  })
  .strict();
const legacyFamilyDataSchema = z
  .object({
    ...legacyFamilyDataShape,
    child: legacyChildSchema,
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

type NormalizableState = Omit<AppState, "child"> & {
  child: z.infer<typeof legacyChildSchema>;
};

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

const dbPromise = openDB("family-pets", CURRENT_SCHEMA_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("app")) db.createObjectStore("app");
  },
});

function normalizeSelectedPet(candidate: NormalizableState): AppState {
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

function migrateLegacyState(rawState: unknown): AppState {
  const legacy = legacyStateSchema.parse(rawState);
  return normalizeSelectedPet({
    ...legacy,
    setupCompleted:
      legacy.parentPin !== RESERVED_PARENT_PIN && (legacy.setupCompleted ?? true),
    claimedLevelMilestones: [],
    claimedCompanionRewards: [],
  });
}

function parseVersionedState(schemaVersion: number, rawState: unknown): AppState {
  if (schemaVersion === CURRENT_SCHEMA_VERSION) {
    return normalizeSelectedPet(appStateSchema.parse(rawState));
  }
  if (schemaVersion === 1 || schemaVersion === 2 || schemaVersion === 3) {
    return migrateLegacyState(rawState);
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
    } else if (
      envelope.schemaVersion === 1 ||
      envelope.schemaVersion === 2 ||
      envelope.schemaVersion === 3
    ) {
      const fullState = legacyStateSchema.safeParse(envelope.state);
      const legacy = fullState.success
        ? fullState.data
        : {
            ...legacyFamilyDataSchema.parse(envelope.state),
            setupCompleted: true,
            parentPin: "0000",
          };
      family = toFamilyData(migrateLegacyState(legacy));
    } else {
      throw new Error("不支持的数据版本");
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
