import type { App, MarkdownPostProcessorContext } from "obsidian";
import { MarkdownRenderChild } from "obsidian";
import { collectTocHeadings, type TocHeading } from "./headings";
import { parseTocSource } from "./parse-toc";
import type { ConspectusSettings } from "./settings";
import { DEFAULT_SETTINGS } from "./settings";

/** Active widgets keyed by their root element (same-el re-renders). */
const widgetRegistry = new WeakMap<HTMLElement, ConspectusTocWidget>();

/** All live widgets (for refresh-all on settings / metadata changes). */
const liveWidgets = new Set<ConspectusTocWidget>();

export type SettingsProvider = () => ConspectusSettings;

let getSettings: SettingsProvider = () => ({ ...DEFAULT_SETTINGS });

export function setSettingsProvider(fn: SettingsProvider): void {
	getSettings = fn;
}

export function refreshTocsForPath(sourcePath: string): void {
	for (const widget of liveWidgets) {
		if (widget.sourcePath === sourcePath) {
			widget.rebuild();
		}
	}
}

export function refreshAllTocs(): void {
	for (const widget of liveWidgets) {
		widget.rebuild();
	}
}

export function renderToc(
	app: App,
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
): void {
	const existing = widgetRegistry.get(el);
	if (existing) {
		existing.update(source);
		return;
	}
	const widget = new ConspectusTocWidget(app, el, source, ctx.sourcePath);
	widgetRegistry.set(el, widget);
	ctx.addChild(widget);
	widget.mount();
}

export class ConspectusTocWidget extends MarkdownRenderChild {
	app: App;
	sourcePath: string;
	private source: string;
	private root: HTMLElement;

	constructor(app: App, containerEl: HTMLElement, source: string, sourcePath: string) {
		super(containerEl);
		this.app = app;
		this.source = source;
		this.sourcePath = sourcePath;
		this.root = containerEl;
	}

	onload(): void {
		liveWidgets.add(this);
	}

	onunload(): void {
		liveWidgets.delete(this);
		widgetRegistry.delete(this.root);
	}

	update(source: string): void {
		this.source = source;
		this.rebuild();
	}

	mount(): void {
		this.rebuild();
	}

	rebuild(): void {
		const opts = parseTocSource(this.source);
		const settings = getSettings();
		const maxLevel = opts.level ?? settings.maxHeadingLevel;
		const title = opts.title !== undefined ? opts.title : settings.defaultTitle;
		const breakBefore = opts.breakBefore ?? settings.pageBreakBeforeToc;
		const breakAfter = opts.breakAfter ?? settings.pageBreakAfterToc;
		const showInExport = opts.showInExport ?? settings.showInExport;
		const pageNumberLevel = opts.pageNumberLevel ?? settings.pageNumberLevel;
		const showLeaders = opts.showLeaders ?? settings.showLeaders;
		const headings = collectTocHeadings(this.app, this.sourcePath, maxLevel);

		this.root.empty();
		this.root.addClass("conspectus-toc");
		this.root.toggleClass("conspectus-toc-break-before", breakBefore);
		this.root.toggleClass("conspectus-toc-break-after", breakAfter);
		this.root.toggleClass("conspectus-toc-hide-export", !showInExport);
		this.root.setAttribute("data-conspectus-level", String(maxLevel));
		this.root.setAttribute("data-conspectus-page-numbers", String(pageNumberLevel));
		this.root.setAttribute("data-conspectus-leaders", showLeaders ? "true" : "false");

		if (title) {
			this.root.createEl("h1", {
				cls: "conspectus-toc-title",
				text: title,
				attr: { "data-heading": title },
			});
		}

		if (headings.length === 0) {
			this.root.createDiv({
				cls: "conspectus-toc-empty",
				text: "No headings",
			});
			return;
		}

		const list = this.root.createEl("ul", { cls: "conspectus-toc-list" });
		buildNestedList(list, headings);
	}
}

/**
 * Nested unnumbered list. Depth is relative to the shallowest heading in the set.
 * Skipped levels nest under the previous item.
 */
function buildNestedList(rootUl: HTMLElement, headings: TocHeading[]): void {
	const minLevel = Math.min(...headings.map((h) => h.level));
	const listStack: HTMLElement[] = [rootUl];

	for (const h of headings) {
		const depth = h.level - minLevel;

		while (listStack.length - 1 > depth) {
			listStack.pop();
		}
		while (listStack.length - 1 < depth) {
			const currentList = listStack[listStack.length - 1]!;
			let lastLi = currentList.lastElementChild;
			if (!(lastLi instanceof HTMLElement)) {
				lastLi = currentList.createEl("li", { cls: "conspectus-toc-item" });
			}
			const nested = lastLi.createEl("ul", { cls: "conspectus-toc-list" });
			listStack.push(nested);
		}

		const li = listStack[listStack.length - 1]!.createEl("li", {
			cls: `conspectus-toc-item conspectus-toc-h${h.level}`,
		});
		// Hash-only data-href matches Obsidian same-note [[#Heading]] links for Pagina.
		li.createEl("a", {
			cls: "internal-link",
			text: h.heading,
			attr: {
				href: `#${h.heading}`,
				"data-href": `#${h.heading}`,
				"data-heading": h.heading,
				"data-tooltip-position": "top",
				rel: "noopener nofollow",
			},
		});
	}
}
