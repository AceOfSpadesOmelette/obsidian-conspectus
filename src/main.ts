import { Editor, Plugin } from "obsidian";
import {
	refreshAllTocs,
	refreshTocsForPath,
	renderToc,
	setSettingsProvider,
} from "./render-toc";
import {
	DEFAULT_SETTINGS,
	normalizeSettings,
	ConspectusSettingTab,
	type ConspectusSettings,
} from "./settings";

function buildInsertFence(settings: ConspectusSettings): string {
	const lines = ["```conspectus"];
	const title = settings.defaultTitle.trim();
	if (title) lines.push(`title: ${title}`);
	lines.push("```", "");
	return lines.join("\n");
}

export default class ConspectusPlugin extends Plugin {
	settings: ConspectusSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		setSettingsProvider(() => this.settings);

		this.addSettingTab(new ConspectusSettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor("conspectus", (source, el, ctx) => {
			renderToc(this.app, source, el, ctx);
		});

		this.addCommand({
			id: "insert-toc",
			name: "Insert table of contents",
			editorCallback: (editor: Editor) => {
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				const prefix = line.length > 0 && cursor.ch > 0 ? "\n" : "";
				editor.replaceSelection(`${prefix}${buildInsertFence(this.settings)}`);
			},
		});

		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				refreshTocsForPath(file.path);
			}),
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	refreshAllTocs(): void {
		refreshAllTocs();
	}
}
