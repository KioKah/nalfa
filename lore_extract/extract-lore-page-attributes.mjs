import fs from "node:fs";

const [, , inputPath = "data.json", outputPath = "output.json"] = process.argv;

const source = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const templatesById = indexById(source.templates);
const imagesById = indexById(source.importedImages);
const modulesById = new Map();
const runesById = new Map();
const choicesById = new Map();

for (const template of source.templates ?? []) {
	for (const module of template.usedModules ?? []) modulesById.set(module.idHash, module);
}

for (const group of source.runeGroups ?? []) {
	for (const rune of group.runes ?? []) {
		runesById.set(rune.idHash, rune);

		for (const choice of rune.choiceConfig?.values ?? []) {
			choicesById.set(choice.idHash, choice);
		}
	}
}

const pages = (source.pages ?? []).map(extractPage).filter((page) => page.attributes.length);

fs.writeFileSync(outputPath, `${JSON.stringify(pages, null, "\t")}\n`, "utf8");
console.log(JSON.stringify({ inputPath, outputPath, pages: pages.length }, null, 2));

function indexById(values = []) {
	return new Map(values.map((value) => [value.idHash, value]));
}

function extractPage(page) {
	const template = templatesById.get(page.templateId);
	const attributes = [];

	for (const content of page.pageContent ?? []) {
		const module = modulesById.get(content.relatedModuleId);
		const section = module?.header || content.header || undefined;

		const bodyText = htmlToText(content.body);
		if (bodyText) attributes.push(withSection({ type: "text", value: bodyText }, section));

		const image = extractImage(content.visualContent);
		if (image) attributes.push(withSection({ type: "image", value: image }, section));

		for (const runeContent of content.runesContent ?? []) {
			const rune = runesById.get(runeContent.relatedRuneId);
			const value = extractRuneValue(runeContent.values ?? [], rune);

			if (value !== undefined) {
				attributes.push(withSection({ name: rune?.label ?? "Unknown", value }, section));
			}
		}
	}

	return {
		name: page.name,
		template: template?.name,
		attributes,
	};
}

function withSection(attribute, section) {
	if (!section) return attribute;
	return { section, ...attribute };
}

function extractImage(visualContent) {
	if (!visualContent?.relatedImage) return undefined;

	const image = imagesById.get(visualContent.relatedImage);
	if (!image) return undefined;

	return {
		name: image.displayedName,
		path: `img/${image.idHash}.${image.extension}`,
	};
}

function extractRuneValue(values, rune) {
	const extracted = values.map((value) => extractSingleValue(value, rune)).filter(hasValue);
	if (!extracted.length) return undefined;
	if (extracted.length === 1) return extracted[0];
	return extracted;
}

function extractSingleValue(value, rune) {
	const parts = {};

	if (value.text) parts.text = value.text;
	if (value.choice) parts.choice = choicesById.get(value.choice)?.value ?? value.choice;
	if (value.tag) parts.tag = value.tag;
	if (value.divergent) parts.divergent = value.divergent;
	if (rune?.type === "LR_Quantum" || value.quantum !== 0) parts.quantum = value.quantum;

	const keys = Object.keys(parts);
	if (!keys.length) return undefined;
	if (keys.length === 1) return parts[keys[0]];
	return parts;
}

function hasValue(value) {
	return value !== undefined && value !== "";
}

function htmlToText(html) {
	if (!html) return "";
	return html
		.replace(/<\s*br\s*\/?>/gi, "\n")
		.replace(/<\s*\/p\s*>/gi, "\n")
		.replace(/<[^>]*>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.join("\n");
}
