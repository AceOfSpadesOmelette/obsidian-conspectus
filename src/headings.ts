import { type App, TFile } from "obsidian";
import type { MaxHeadingLevel } from "./settings";

export interface TocHeading {
	level: number;
	heading: string;
}

/** Headings from the metadata cache, filtered by max level. */
export function collectTocHeadings(
	app: App,
	sourcePath: string,
	maxLevel: MaxHeadingLevel,
): TocHeading[] {
	const file = app.vault.getAbstractFileByPath(sourcePath);
	if (!(file instanceof TFile)) return [];
	const cache = app.metadataCache.getFileCache(file);
	const headings = cache?.headings ?? [];
	const out: TocHeading[] = [];
	for (const h of headings) {
		if (h.level < 1 || h.level > maxLevel) continue;
		const title = (h.heading ?? "").trim();
		if (!title) continue;
		out.push({ level: h.level, heading: title });
	}
	return out;
}
