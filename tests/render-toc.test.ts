import { MarkdownRenderChild } from "obsidian";
import { fillTocEntryLinks } from "../src/render-toc";
import { normalizeSettings } from "../src/settings";

describe("contents entry markdown", () => {
	it("leaves math and numbered headings as written when rendering is off", async () => {
		const link = document.createElement("a");
		link.dataset.conspectusMarkdown = "1. Lec01 $E=mc^2$";
		const host = document.createElement("div");
		await fillTocEntryLinks({}, [link], "note.md", new MarkdownRenderChild(host), false);

		expect(link.querySelector(".math")).toBeNull();
		expect(link.querySelector("ol")).toBeNull();
		expect(link.textContent).toBe("1. Lec01 $E=mc^2$");
	});

	it("renders math and keeps a leading number as text", async () => {
		const link = document.createElement("a");
		link.dataset.conspectusMarkdown = "1. Energy $E=mc^2$";
		const host = document.createElement("div");
		await fillTocEntryLinks({}, [link], "note.md", new MarkdownRenderChild(host), true);

		expect(link.querySelector("p")).toBeNull();
		expect(link.querySelector("ol")).toBeNull();
		expect(link.querySelector(".math")?.textContent).toBe("E=mc^2");
		expect(link.textContent).toContain("1. Energy");
		expect(link.textContent?.includes("\u200B")).toBe(false);
	});
});

describe("math setting", () => {
	it("stays off unless it is explicitly enabled", () => {
		expect(normalizeSettings({}).renderMath).toBe(false);
		expect(normalizeSettings({ renderMath: true }).renderMath).toBe(true);
	});
});
