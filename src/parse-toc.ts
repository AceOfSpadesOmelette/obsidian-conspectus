import type { MaxHeadingLevel } from "./settings";

export interface TocBlockOptions {
	/** Present when the fence body sets `level: N`. */
	level?: MaxHeadingLevel;
	/**
	 * Present when the fence sets `title: …`.
	 * Empty string means explicitly no title.
	 */
	title?: string;
	/** Present when the fence sets `break-before: true|false`. */
	breakBefore?: boolean;
	/** Present when the fence sets `break-after: true|false`. */
	breakAfter?: boolean;
	/** Present when the fence sets `export: true|false`. */
	showInExport?: boolean;
	/** 0 hides page numbers. 1–6 numbers entries up to that level. */
	pageNumberLevel?: 0 | MaxHeadingLevel;
	/** Present when the fence sets `leaders: true|false`. */
	showLeaders?: boolean;
}

function parseBool(raw: string): boolean | undefined {
	const v = raw.trim().toLowerCase();
	if (v === "true" || v === "yes" || v === "1" || v === "on") return true;
	if (v === "false" || v === "no" || v === "0" || v === "off") return false;
	return undefined;
}

/**
 * Parse optional keys from a conspectus fence body.
 * Unknown keys are ignored; invalid values are ignored.
 */
export function parseTocSource(source: string): TocBlockOptions {
	const opts: TocBlockOptions = {};
	const text = source.replace(/\r\n/g, "\n").trim();
	if (!text) return opts;

	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const levelMatch = /^level\s*:\s*(\d+)\s*$/i.exec(trimmed);
		if (levelMatch) {
			const n = Number(levelMatch[1]);
			if (n >= 1 && n <= 6) opts.level = n as MaxHeadingLevel;
			continue;
		}

		const titleMatch = /^title\s*:\s*(.*)$/i.exec(trimmed);
		if (titleMatch) {
			opts.title = (titleMatch[1] ?? "").trim();
			continue;
		}

		const beforeMatch = /^break-before\s*:\s*(.+)$/i.exec(trimmed);
		if (beforeMatch) {
			const b = parseBool(beforeMatch[1] ?? "");
			if (b !== undefined) opts.breakBefore = b;
			continue;
		}

		const afterMatch = /^break-after\s*:\s*(.+)$/i.exec(trimmed);
		if (afterMatch) {
			const b = parseBool(afterMatch[1] ?? "");
			if (b !== undefined) opts.breakAfter = b;
			continue;
		}

		const exportMatch = /^export\s*:\s*(.+)$/i.exec(trimmed);
		if (exportMatch) {
			const b = parseBool(exportMatch[1] ?? "");
			if (b !== undefined) opts.showInExport = b;
			continue;
		}

		const pageMatch = /^page-numbers\s*:\s*(.+)$/i.exec(trimmed);
		if (pageMatch) {
			const raw = (pageMatch[1] ?? "").trim().toLowerCase();
			if (raw === "off" || raw === "none" || raw === "false" || raw === "0") {
				opts.pageNumberLevel = 0;
			} else {
				const n = Number(raw);
				if (n >= 1 && n <= 6) opts.pageNumberLevel = n as MaxHeadingLevel;
			}
			continue;
		}

		const leadersMatch = /^leaders\s*:\s*(.+)$/i.exec(trimmed);
		if (leadersMatch) {
			const b = parseBool(leadersMatch[1] ?? "");
			if (b !== undefined) opts.showLeaders = b;
		}
	}
	return opts;
}
