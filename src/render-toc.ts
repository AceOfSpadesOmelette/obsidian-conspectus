import type { App, MarkdownPostProcessorContext } from "obsidian";
import { MarkdownRenderChild, MarkdownRenderer } from "obsidian";
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
		const indentEm = settings.indentPerLevel;
		const headings = collectTocHeadings(this.app, this.sourcePath, maxLevel);

		this.root.empty();
		this.root.addClass("conspectus-toc");
		this.root.style.setProperty("--conspectus-indent-step", `${indentEm}em`);
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
		const links = buildNestedList(list, headings, settings.alignHeading1);
		void fillTocEntryLinks(this.app, links, this.sourcePath, this, settings.renderMath);
	}
}

/**
 * Nested unnumbered list. Depth is relative to the shallowest heading in the set.
 * Skipped levels nest under the previous item.
 */
function buildNestedList(
	rootUl: HTMLElement,
	headings: TocHeading[],
	alignHeading1: boolean,
): HTMLAnchorElement[] {
	const minLevel = Math.min(...headings.map((h) => h.level));
	const levelOffset = Math.max(0, minLevel - 1);
	const listIndent = alignHeading1 ? "0px" : "3ch";
	const rootIndent =
		levelOffset === 0
			? listIndent
			: `calc(${listIndent} + var(--conspectus-indent-step, 1.25em) * ${levelOffset})`;
	rootUl.style.setProperty("--conspectus-root-indent", rootIndent);
	const listStack: HTMLElement[] = [rootUl];
	const links: HTMLAnchorElement[] = [];

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
		// Math is rendered only when that setting is on.
		const link = li.createEl("a", {
			cls: "internal-link",
			attr: {
				href: `#${h.heading}`,
				"data-href": `#${h.heading}`,
				"data-heading": h.heading,
				"data-tooltip-position": "top",
				rel: "noopener nofollow",
			},
		});
		link.dataset.conspectusMarkdown = h.heading;
		links.push(link);
	}
	return links;
}

/** Render math when asked. Otherwise leave the heading text as written, so `1. ` is not a list. */
export async function fillTocEntryLinks(
	app: App,
	links: readonly HTMLAnchorElement[],
	sourcePath: string,
	component: MarkdownRenderChild,
	renderMath = false,
): Promise<void> {
	if (!renderMath) {
		for (const link of links) link.textContent = link.dataset.conspectusMarkdown ?? "";
		return;
	}
	await Promise.all(links.map((link) => fillTocEntryLink(app, link, sourcePath, component)));
}

async function fillTocEntryLink(
	app: App,
	link: HTMLAnchorElement,
	sourcePath: string,
	component: MarkdownRenderChild,
): Promise<void> {
	const markdown = link.dataset.conspectusMarkdown ?? "";
	if (!markdown) return;
	try {
		// A leading number such as "1. Title" would become a real list and indent the line.
		await MarkdownRenderer.render(app, `\u200B${markdown}`, link, sourcePath, component);
		unwrapRenderedParagraphs(link);
		stripLeadingMark(link);
		if (!(link.textContent ?? "").replace(/\u200B/g, "").trim()) link.textContent = markdown;
	} catch {
		link.textContent = markdown;
	}
}

function stripLeadingMark(el: HTMLElement): void {
	const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const first = walker.nextNode();
	if (first && first.textContent?.startsWith("\u200B")) {
		first.textContent = first.textContent.slice(1);
	}
}

function unwrapRenderedParagraphs(el: HTMLElement): void {
	el.querySelectorAll(":scope > p").forEach((paragraph) => {
		while (paragraph.firstChild) el.insertBefore(paragraph.firstChild, paragraph);
		paragraph.remove();
	});
}
