import "fake-indexeddb/auto";
import { openDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import { seedState } from "./domain";
import { appRepository, CURRENT_SCHEMA_VERSION } from "./repository";

const STORAGE_KEY = "family_pets_app_state_v1";

async function writeEnvelope(value: unknown) {
  const db = await openDB("family-pets", CURRENT_SCHEMA_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("app"))
        database.createObjectStore("app");
    },
  });
  await db.put("app", value, STORAGE_KEY);
  db.close();
}

describe("repository schema and backups", () => {
  beforeEach(async () => {
    const db = await openDB("family-pets", CURRENT_SCHEMA_VERSION);
    await db.clear("app");
    db.close();
  });

  it("migrates v1/v2/v3 records to v4 and derives setup state from the PIN", async () => {
    const state = seedState();
    state.parentPin = "1357";
    const {
      setupCompleted: _setupCompleted,
      claimedLevelMilestones: _claimedLevels,
      claimedCompanionRewards: _claimedCompanion,
      ...legacyState
    } = state;
    const child: Omit<typeof state.child, "currentPetId"> & {
      currentPetId?: string;
    } = { ...state.child };
    delete child.currentPetId;
    await writeEnvelope({
      schemaVersion: 1,
      state: { ...legacyState, child },
    });

    const loaded = await appRepository.load();

    expect(loaded.setupCompleted).toBe(true);
    expect(loaded.child.currentPetId).toBe("tuantuan");
    const db = await openDB("family-pets", CURRENT_SCHEMA_VERSION);
    const saved = (await db.get("app", STORAGE_KEY)) as {
      schemaVersion: number;
    };
    expect(saved.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(loaded.claimedLevelMilestones).toEqual([]);
    expect(loaded.claimedCompanionRewards).toEqual([]);
    db.close();
  });

  it("routes legacy reserved-PIN data back to setup without losing progress", async () => {
    const state = seedState();
    state.progress.pointsBalance = 88;
    const {
      setupCompleted: _setupCompleted,
      claimedLevelMilestones: _claimedLevels,
      claimedCompanionRewards: _claimedCompanion,
      ...legacyState
    } = state;
    await writeEnvelope({ schemaVersion: 2, state: legacyState });

    const loaded = await appRepository.load();

    expect(loaded.setupCompleted).toBe(false);
    expect(loaded.progress.pointsBalance).toBe(88);
  });

  it("exports complete family data without PIN or setup state", () => {
    const state = seedState();
    state.setupCompleted = true;
    state.parentPin = "1357";

    const raw = appRepository.export(state);
    const parsed = JSON.parse(raw) as { state: Record<string, unknown> };

    expect(parsed.state).not.toHaveProperty("parentPin");
    expect(parsed.state).not.toHaveProperty("setupCompleted");
    expect(parsed.state).toHaveProperty("claimedLevelMilestones", []);
    expect(parsed.state).toHaveProperty("claimedCompanionRewards", []);
    expect(raw).not.toContain("1357");
  });

  it("previews new and legacy backups without mutating IndexedDB", async () => {
    const state = seedState();
    state.setupCompleted = true;
    state.parentPin = "2468";
    state.child.name = "安安";
    state.progress.level = 3;
    state.progress.pointsBalance = 42;
    const currentPreview = appRepository.previewBackup(appRepository.export(state));
    expect(currentPreview.summary).toMatchObject({
      childName: "安安",
      level: 3,
      points: 42,
      taskCount: 4,
      rewardCount: 3,
    });

    const {
      claimedLevelMilestones: _claimedLevels,
      claimedCompanionRewards: _claimedCompanion,
      ...legacyState
    } = state;
    const legacyPreview = appRepository.previewBackup(
      JSON.stringify({ schemaVersion: 3, state: legacyState }),
    );
    expect(legacyPreview.state.child.name).toBe("安安");
    expect(legacyPreview.state).not.toHaveProperty("parentPin");
    expect(await appRepository.load()).toMatchObject({ setupCompleted: false });
  });

  it("normalizes a restored pet that is still locked", () => {
    const state = seedState();
    state.setupCompleted = true;
    state.parentPin = "2468";
    state.child.currentPetId = "mili";
    state.child.currentPetName = "米粒";

    const {
      claimedLevelMilestones: _claimedLevels,
      claimedCompanionRewards: _claimedCompanion,
      ...legacyState
    } = state;
    const preview = appRepository.previewBackup(
      JSON.stringify({ schemaVersion: 2, state: legacyState }),
    );

    expect(preview.state.child.currentPetId).toBe("tuantuan");
    expect(preview.state.child.currentPetName).toBe("团团");
  });

  it("rejects malformed or incomplete backups", () => {
    expect(() => appRepository.previewBackup("not-json")).toThrow(
      "备份文件不是有效 JSON",
    );
    expect(() =>
      appRepository.previewBackup(
        JSON.stringify({ schemaVersion: 4, state: { child: {} } }),
      ),
    ).toThrow("备份文件字段不完整");
  });

  it("rejects duplicate or unknown v4 claim identifiers", () => {
    const state = seedState();
    const parsed = JSON.parse(appRepository.export(state)) as {
      schemaVersion: number;
      state: Record<string, unknown>;
    };
    parsed.state.claimedLevelMilestones = ["level-2", "level-2"];
    expect(() => appRepository.previewBackup(JSON.stringify(parsed))).toThrow(
      "备份文件字段不完整",
    );
    parsed.state.claimedLevelMilestones = ["level-99"];
    expect(() => appRepository.previewBackup(JSON.stringify(parsed))).toThrow(
      "备份文件字段不完整",
    );
  });
});
