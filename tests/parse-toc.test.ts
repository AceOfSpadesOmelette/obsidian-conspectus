import { parseTocSource } from "../src/parse-toc";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

describe("parseTocSource", () => {
	it("returns empty options for blank body", () => {
		expect(parseTocSource("")).toEqual({});
		expect(parseTocSource("  \n  ")).toEqual({});
	});

	it("parses known keys", () => {
		expect(
			parseTocSource(`level: 3
title: Contents
break-before: true
break-after: no
export: off
page-numbers: 2
leaders: no
# ignored
unknown: x`),
		).toEqual({
			level: 3,
			title: "Contents",
			breakBefore: true,
			breakAfter: false,
			showInExport: false,
			pageNumberLevel: 2,
			showLeaders: false,
		});
	});

	it("accepts page-numbers off", () => {
		expect(parseTocSource("page-numbers: off")).toEqual({ pageNumberLevel: 0 });
	});

	it("allows empty title", () => {
		expect(parseTocSource("title:   ")).toEqual({ title: "" });
	});

	it("ignores invalid level", () => {
		expect(parseTocSource("level: 9")).toEqual({});
	});
});

describe("normalizeSettings", () => {
	it("applies defaults", () => {
		expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
	});

	it("clamps max heading level", () => {
		expect(normalizeSettings({ maxHeadingLevel: 0 }).maxHeadingLevel).toBe(6);
		expect(normalizeSettings({ maxHeadingLevel: 3 }).maxHeadingLevel).toBe(3);
	});
});
