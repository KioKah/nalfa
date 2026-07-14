import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [, , archivePath = "Nalfa.lore"] = process.argv;
const resolvedArchivePath = path.resolve(process.cwd(), archivePath);
const mappingPath = path.resolve(process.cwd(), "lore_extract/creature-mapping.json");

if (!fs.existsSync(resolvedArchivePath)) {
	console.error(`Lore archive not found: ${resolvedArchivePath}`);
	process.exit(1);
}

const entries = execFileSync("tar", ["-tf", toShellPath(resolvedArchivePath)], {
	encoding: "utf8",
})
	.split(/\r?\n/)
	.filter(Boolean);

if (!entries.includes("data.json")) {
	throw new Error("Lore archive does not contain data.json");
}

const dataJson = execFileSync("tar", ["-xOf", toShellPath(resolvedArchivePath), "data.json"], {
	encoding: "utf8",
});
const data = JSON.parse(dataJson);

if (!Array.isArray(data.pages)) throw new Error("data.json has no pages array");
if (!Array.isArray(data.templates)) throw new Error("data.json has no templates array");
if (!Array.isArray(data.runeGroups)) throw new Error("data.json has no runeGroups array");

const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
const extracted = extractPages(data);
const coveredLabels = new Set([
	...Object.keys(mapping.directAttributes ?? {}),
	...Object.keys(mapping.specialAttributes ?? {}),
	...(mapping.descriptionAttributes ?? []),
]);
const creaturePages = extracted.filter((page) => page.template === mapping.creatureTemplate);
const labels = new Set();

for (const page of creaturePages) {
	for (const attribute of page.attributes) {
		if (attribute.name) labels.add(attribute.name);
	}
}

const unmapped = [...labels].filter((label) => !coveredLabels.has(label)).sort();
if (unmapped.length) {
	throw new Error(`Unmapped creature attribute labels: ${unmapped.join(", ")}`);
}

console.log(
	JSON.stringify(
		{
			archivePath: resolvedArchivePath,
			entries: entries.length,
			pages: data.pages.length,
			creatures: creaturePages.length,
			images: entries.filter((entry) => entry.startsWith("img/") && !entry.endsWith("/"))
				.length,
		},
		null,
		2,
	),
);

function extractPages(source) {
	const templatesById = new Map((source.templates ?? []).map((template) => [template.idHash, template]));
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

	return (source.pages ?? []).map((page) => {
		const template = templatesById.get(page.templateId);
		const attributes = [];

		for (const content of page.pageContent ?? []) {
			const module = modulesById.get(content.relatedModuleId);
			const section = module?.header || content.header || undefined;

			if (htmlToText(content.body)) attributes.push(withSection({ type: "text" }, section));

			for (const runeContent of content.runesContent ?? []) {
				const rune = runesById.get(runeContent.relatedRuneId);
				const hasValue = (runeContent.values ?? []).some((value) => {
					return value.text || value.choice || value.tag || value.divergent || value.quantum !== 0;
				});

				if (hasValue) attributes.push(withSection({ name: rune?.label ?? "Unknown" }, section));
			}
		}

		return { name: page.name, template: template?.name, attributes };
	});

	function htmlToText(html) {
		if (!html) return "";
		return String(html).replace(/<[^>]*>/g, "").trim();
	}

	function withSection(attribute, section) {
		if (!section) return attribute;
		return { section, ...attribute };
	}
}

function toShellPath(filePath) {
	try {
		return execFileSync("cygpath", ["-u", filePath], { encoding: "utf8" }).trim();
	} catch {
		return filePath;
	}
}
