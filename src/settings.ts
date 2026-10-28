import { App, Notice, PluginSettingTab, type SettingDefinitionItem } from "obsidian";
import type ConspectusPlugin from "./main";
import {
	applyImportedSettings,
	downloadSettingsJson,
	parseSettingsJson,
	pickSettingsFile,
} from "./settings-io";

export type MaxHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface ConspectusSettings {
	maxHeadingLevel: MaxHeadingLevel;
	/** Default H1 above the TOC; empty = no title. */
	defaultTitle: string;
	/** When false, TOC is hidden in Pagina PDF export (still visible in-note). */
	showInExport: boolean;
	pageBreakBeforeToc: boolean;
	pageBreakAfterToc: boolean;
	/** 0 hides page numbers. 1–6 numbers entries up to that heading level. */
	pageNumberLevel: 0 | MaxHeadingLevel;
	/** Dotted leaders before the page number. The number stays when this is off. */
	showLeaders: boolean;
}

export const DEFAULT_SETTINGS: ConspectusSettings = {
	maxHeadingLevel: 6,
	defaultTitle: "Table of Contents",
	showInExport: true,
	pageBreakBeforeToc: false,
	pageBreakAfterToc: false,
	pageNumberLevel: 0,
	showLeaders: true,
};

export function normalizeSettings(raw: unknown): ConspectusSettings {
	const data = (raw ?? {}) as Partial<ConspectusSettings>;
	const level = Number(data.maxHeadingLevel);
	const maxHeadingLevel = (
		level >= 1 && level <= 6 ? level : DEFAULT_SETTINGS.maxHeadingLevel
	) as MaxHeadingLevel;
	return {
		maxHeadingLevel,
		defaultTitle:
			typeof data.defaultTitle === "string"
				? data.defaultTitle
				: DEFAULT_SETTINGS.defaultTitle,
		showInExport: data.showInExport ?? DEFAULT_SETTINGS.showInExport,
		pageBreakBeforeToc: Boolean(
			data.pageBreakBeforeToc ?? DEFAULT_SETTINGS.pageBreakBeforeToc,
		),
		pageBreakAfterToc: Boolean(
			data.pageBreakAfterToc ?? DEFAULT_SETTINGS.pageBreakAfterToc,
		),
		pageNumberLevel: normalizePageNumberLevel(data.pageNumberLevel),
		showLeaders: data.showLeaders ?? DEFAULT_SETTINGS.showLeaders,
	};
}

function normalizePageNumberLevel(value: unknown): 0 | MaxHeadingLevel {
	const level = Number(value);
	if (level >= 1 && level <= 6) return level as MaxHeadingLevel;
	return 0;
}

const PAGE_NUMBER_OPTIONS: Record<string, string> = {
	"0": "Off",
	"1": "Heading 1",
	"2": "Headings 1–2",
	"3": "Headings 1–3",
	"4": "Headings 1–4",
	"5": "Headings 1–5",
	"6": "Headings 1–6",
};

const HEADING_LEVEL_OPTIONS: Record<string, string> = {
	"1": "Heading 1",
	"2": "Heading 2",
	"3": "Heading 3",
	"4": "Heading 4",
	"5": "Heading 5",
	"6": "Heading 6",
};

export class ConspectusSettingTab extends PluginSettingTab {
	plugin: ConspectusPlugin;

	constructor(app: App, plugin: ConspectusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	override getControlValue(key: string): unknown {
		if (key === "maxHeadingLevel") {
			return String(this.plugin.settings.maxHeadingLevel);
		}
		if (key === "pageNumberLevel") {
			return String(this.plugin.settings.pageNumberLevel);
		}
		return super.getControlValue(key);
	}

	override async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === "maxHeadingLevel") {
			const level = Number(value);
			value = level >= 1 && level <= 6 ? level : this.plugin.settings.maxHeadingLevel;
		}
		if (key === "pageNumberLevel") {
			const level = Number(value);
			value = level >= 1 && level <= 6 ? level : 0;
		}
		await super.setControlValue(key, value);
		this.plugin.refreshAllTocs();
	}

	override getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Max heading level",
				desc: "Include headings up to this level in the table of contents. A conspectus block can override this with level: N.",
				control: {
					type: "dropdown",
					key: "maxHeadingLevel",
					options: HEADING_LEVEL_OPTIONS,
				},
			},
			{
				name: "Default title",
				desc: "H1 shown above the TOC. Leave blank for no title. Override per block with title: …",
				control: {
					type: "text",
					key: "defaultTitle",
					placeholder: "Table of Contents",
				},
			},
			{
				name: "Show TOC in PDF export",
				desc: "Include the TOC when exporting with Pagina. Turn off to keep the TOC in the note but omit it from the PDF. Override per block with export: true|false.",
				control: { type: "toggle", key: "showInExport" },
			},
			{
				name: "Page break before TOC (PDF)",
				desc: "When exporting with Pagina, start the TOC on a new page. Override per block with break-before: true|false.",
				control: { type: "toggle", key: "pageBreakBeforeToc" },
			},
			{
				name: "Page break after TOC (PDF)",
				desc: "When exporting with Pagina, start a new page after the TOC. Override per block with break-after: true|false.",
				control: { type: "toggle", key: "pageBreakAfterToc" },
			},
			{
				name: "Page numbers up to heading level",
				desc: "In a Pagina PDF, number contents entries through this level. Off leaves the list unchanged. Override per block with page-numbers: N or page-numbers: off.",
				control: {
					type: "dropdown",
					key: "pageNumberLevel",
					options: PAGE_NUMBER_OPTIONS,
				},
			},
			{
				name: "Dot leaders",
				desc: "Draw dotted leaders before the page number. The number stays at the right when this is off. Override per block with leaders: true|false.",
				control: { type: "toggle", key: "showLeaders" },
			},
			{
				type: "group",
				heading: "Backup",
				items: [
					{
						name: "Export settings",
						desc: "Download the current configuration as JSON.",
						action: () => {
							downloadSettingsJson(this.plugin.settings, "conspectus-settings.json");
						},
					},
					{
						name: "Import settings",
						desc: "Replace the current configuration from a JSON file.",
						action: () => {
							this.importSettings();
						},
					},
				],
			},
		];
	}

	private importSettings(): void {
		pickSettingsFile((text) => {
			try {
				const next = parseSettingsJson(text, normalizeSettings);
				applyImportedSettings(this.plugin.settings, next);
				void this.plugin.saveSettings().then(
					() => {
						this.plugin.refreshAllTocs();
						this.update();
						new Notice("Conspectus settings imported");
					},
					() => {
						new Notice("Could not import settings");
					},
				);
			} catch (err) {
				new Notice(err instanceof Error ? err.message : "Could not import settings");
			}
		});
	}
}
