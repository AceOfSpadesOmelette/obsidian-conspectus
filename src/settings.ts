import { App, PluginSettingTab, Setting } from "obsidian";
import type ConspectusPlugin from "./main";
import { applyImportedSettings, mountSettingsFileControls } from "./settings-io";

export type MaxHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface ConspectusSettings {
	maxHeadingLevel: MaxHeadingLevel;
	/** Default H1 above the TOC; empty = no title. */
	defaultTitle: string;
	/** When false, TOC is hidden in Pagina PDF export (still visible in-note). */
	showInExport: boolean;
	pageBreakBeforeToc: boolean;
	pageBreakAfterToc: boolean;
}

export const DEFAULT_SETTINGS: ConspectusSettings = {
	maxHeadingLevel: 6,
	defaultTitle: "Table of Contents",
	showInExport: true,
	pageBreakBeforeToc: false,
	pageBreakAfterToc: false,
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
	};
}

export class ConspectusSettingTab extends PluginSettingTab {
	plugin: ConspectusPlugin;

	constructor(app: App, plugin: ConspectusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Conspectus" });

		new Setting(containerEl)
			.setName("Max heading level")
			.setDesc(
				"Include headings up to this level in the table of contents. A conspectus block can override this with level: N.",
			)
			.addDropdown((d) => {
				for (let i = 1; i <= 6; i++) {
					d.addOption(String(i), `Heading ${i}`);
				}
				d.setValue(String(this.plugin.settings.maxHeadingLevel));
				d.onChange(async (v) => {
					this.plugin.settings.maxHeadingLevel = Number(v) as MaxHeadingLevel;
					await this.plugin.saveSettings();
					this.plugin.refreshAllTocs();
				});
			});

		new Setting(containerEl)
			.setName("Default title")
			.setDesc(
				"H1 shown above the TOC. Leave blank for no title. Override per block with title: …",
			)
			.addText((t) =>
				t
					.setPlaceholder("Table of Contents")
					.setValue(this.plugin.settings.defaultTitle)
					.onChange(async (v) => {
						this.plugin.settings.defaultTitle = v;
						await this.plugin.saveSettings();
						this.plugin.refreshAllTocs();
					}),
			);

		new Setting(containerEl)
			.setName("Show TOC in PDF export")
			.setDesc(
				"Include the TOC when exporting with Pagina. Turn off to keep the TOC in the note but omit it from the PDF. Override per block with export: true|false.",
			)
			.addToggle((t) =>
				t.setValue(this.plugin.settings.showInExport).onChange(async (v) => {
					this.plugin.settings.showInExport = v;
					await this.plugin.saveSettings();
					this.plugin.refreshAllTocs();
				}),
			);

		new Setting(containerEl)
			.setName("Page break before TOC (PDF)")
			.setDesc(
				"When exporting with Pagina, start the TOC on a new page. Override per block with break-before: true|false.",
			)
			.addToggle((t) =>
				t.setValue(this.plugin.settings.pageBreakBeforeToc).onChange(async (v) => {
					this.plugin.settings.pageBreakBeforeToc = v;
					await this.plugin.saveSettings();
					this.plugin.refreshAllTocs();
				}),
			);

		new Setting(containerEl)
			.setName("Page break after TOC (PDF)")
			.setDesc(
				"When exporting with Pagina, start a new page after the TOC. Override per block with break-after: true|false.",
			)
			.addToggle((t) =>
				t.setValue(this.plugin.settings.pageBreakAfterToc).onChange(async (v) => {
					this.plugin.settings.pageBreakAfterToc = v;
					await this.plugin.saveSettings();
					this.plugin.refreshAllTocs();
				}),
			);

		mountSettingsFileControls(containerEl, {
			filename: "conspectus-settings.json",
			pluginName: "Conspectus",
			getSettings: () => this.plugin.settings,
			normalize: normalizeSettings,
			onImported: async (next) => {
				applyImportedSettings(this.plugin.settings, next);
				await this.plugin.saveSettings();
				this.plugin.refreshAllTocs();
				this.display();
			},
		});
	}
}
