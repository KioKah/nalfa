import fs from "node:fs";
import path from "node:path";

const [, , beforeRoot = ".pack-before", afterRoot = ".pack-after"] = process.argv;
const packsDirectory = path.resolve("packs");

fs.mkdirSync(packsDirectory, { recursive: true });

const categories = new Set([
	...directories(beforeRoot),
	...directories(afterRoot),
]);
const summaries = [];

for (const category of [...categories].sort()) {
	const before = readDocuments(path.join(beforeRoot, category));
	const after = readDocuments(path.join(afterRoot, category));
	const added = [];
	const modified = [];
	const removed = [];

	for (const [id, document] of after) {
		if (!before.has(id)) added.push(document.name);
		else if (stable(document) !== stable(before.get(id))) modified.push(document.name);
	}

	for (const [id, document] of before) {
		if (!after.has(id)) removed.push(document.name);
	}

	added.sort();
	modified.sort();
	removed.sort();
	const summary = {
		category,
		added: added.length,
		modified: modified.length,
		removed: removed.length,
	};
	summaries.push(summary);

	const sections = [
		added.map((name) => `+ ${name}`),
		modified.map((name) => `~ ${name}`),
		removed.map((name) => `- ${name}`),
	].filter((section) => section.length);
	const lines = sections.flatMap((section, index) => (index ? ["", ...section] : section));

	fs.writeFileSync(path.join(packsDirectory, `${category}.CHANGES.txt`), `${lines.join("\n")}\n`);
}

const changedCategories = summaries.filter(({ added, modified, removed }) => {
	return added || modified || removed;
});
const aggregate = changedCategories.length
	? changedCategories.map(formatSummary).join(", ")
	: "no changes";

fs.writeFileSync(path.join(packsDirectory, "CHANGES.txt"), `${aggregate}\n`);
console.log(aggregate);

function directories(root) {
	if (!fs.existsSync(root)) return [];
	return fs.readdirSync(root, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
}

function readDocuments(directory) {
	const documents = new Map();
	if (!fs.existsSync(directory)) return documents;

	for (const file of jsonFiles(directory)) {
		const document = JSON.parse(fs.readFileSync(file, "utf8"));
		const id = document._id ?? path.basename(file, ".json");
		documents.set(id, document);
	}

	return documents;
}

function jsonFiles(directory) {
	const files = [];
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const file = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...jsonFiles(file));
		else if (entry.name.endsWith(".json")) files.push(file);
	}
	return files;
}

function stable(value) {
	if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
	if (value && typeof value === "object") {
		return `{${Object.keys(value)
			.filter((key) => key !== "_stats")
			.sort()
			.map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function formatSummary({ category, added, modified, removed }) {
	const counts = [
		added && `+${added}`,
		modified && `~${modified}`,
		removed && `-${removed}`,
	].filter(Boolean);
	return counts.length ? `${counts.join(" ")} ${category}` : `no changes ${category}`;
}
