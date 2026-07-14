import { describe, expect, it } from "vitest";
import { isBackupReminderDue } from "./backup-preferences";

const DAY = 24 * 60 * 60 * 1000;

describe("backup reminder timing", () => {
  it("reminds after seven days when no backup has been exported", () => {
    expect(
      isBackupReminderDue({ setupAt: 1, lastExportAt: null, dismissedAt: null }, 7 * DAY),
    ).toBe(false);
    expect(
      isBackupReminderDue(
        { setupAt: 1, lastExportAt: null, dismissedAt: null },
        7 * DAY + 1,
      ),
    ).toBe(true);
  });

  it("reminds again thirty days after the most recent export", () => {
    const exportedAt = 10 * DAY;
    expect(
      isBackupReminderDue(
        { setupAt: 1, lastExportAt: exportedAt, dismissedAt: null },
        exportedAt + 30 * DAY,
      ),
    ).toBe(true);
  });

  it("keeps a dismissed reminder hidden until a newer export reference", () => {
    expect(
      isBackupReminderDue(
        { setupAt: 1, lastExportAt: null, dismissedAt: 8 * DAY },
        40 * DAY,
      ),
    ).toBe(false);
    expect(
      isBackupReminderDue(
        { setupAt: 1, lastExportAt: 10 * DAY, dismissedAt: 8 * DAY },
        41 * DAY,
      ),
    ).toBe(true);
  });
});
