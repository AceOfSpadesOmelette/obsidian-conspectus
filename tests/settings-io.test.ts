import { parseSettingsJson, settingsToJson } from "../src/settings-io";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

describe("conspectus settings import", () => {
	it("round-trips and fills defaults", () => {
		const settings = { ...DEFAULT_SETTINGS, defaultTitle: "Contents", maxHeadingLevel: 3 as const };
		const parsed = parseSettingsJson(settingsToJson(settings), normalizeSettings);
		expect(parsed.defaultTitle).toBe("Contents");
		expect(parsed.maxHeadingLevel).toBe(3);
		expect(parsed.showInExport).toBe(true);
		expect(parsed.indentPerLevel).toBe(1.25);
		expect(parsed.alignHeading1).toBe(false);
		expect(parsed.renderMath).toBe(false);
	});

	it("keeps a custom indent and falls back when the value is unusable", () => {
		expect(normalizeSettings({ indentPerLevel: 2 }).indentPerLevel).toBe(2);
		expect(normalizeSettings({ indentPerLevel: "0.5em" }).indentPerLevel).toBe(0.5);
		expect(normalizeSettings({ indentPerLevel: -1 }).indentPerLevel).toBe(1.25);
		expect(normalizeSettings({}).alignHeading1).toBe(false);
		expect(normalizeSettings({ alignHeading1: true }).alignHeading1).toBe(true);
	});

	it("rejects non-objects", () => {
		expect(() => parseSettingsJson("[]", normalizeSettings)).toThrow(/JSON object/);
		expect(() => parseSettingsJson("{", normalizeSettings)).toThrow(/Invalid JSON/);
	});
});
