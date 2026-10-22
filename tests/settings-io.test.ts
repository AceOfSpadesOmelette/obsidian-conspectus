import { parseSettingsJson, settingsToJson } from "../src/settings-io";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

describe("conspectus settings import", () => {
	it("round-trips and fills defaults", () => {
		const settings = { ...DEFAULT_SETTINGS, defaultTitle: "Contents", maxHeadingLevel: 3 as const };
		const parsed = parseSettingsJson(settingsToJson(settings), normalizeSettings);
		expect(parsed.defaultTitle).toBe("Contents");
		expect(parsed.maxHeadingLevel).toBe(3);
		expect(parsed.showInExport).toBe(true);
	});

	it("rejects non-objects", () => {
		expect(() => parseSettingsJson("[]", normalizeSettings)).toThrow(/JSON object/);
		expect(() => parseSettingsJson("{", normalizeSettings)).toThrow(/Invalid JSON/);
	});
});
