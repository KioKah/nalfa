import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const [, , outputPath = "output.json", mappingPath = "creature-mapping.json"] = process.argv;
const root = import.meta.dirname;
const sourceDirectory = path.join(root, "pack-src/creatures");
const systemImageBasePath = "systems/nalfa/lore_extract";

const pages = JSON.parse(fs.readFileSync(outputPath, "utf8"));
const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
const creatures = pages.filter((page) => page.template === mapping.creatureTemplate);

fs.rmSync(sourceDirectory, { recursive: true, force: true });
fs.mkdirSync(sourceDirectory, { recursive: true });

for (const creature of creatures) {
	const actor = buildActor(creature, mapping);
	const fileName = `${slugify(actor.name)}_${actor._id}.json`;
	fs.writeFileSync(
		path.join(sourceDirectory, fileName),
		`${JSON.stringify(actor, null, "\t")}\n`,
		"utf8",
	);
}

console.log(JSON.stringify({ sourceDirectory, actors: creatures.length }, null, 2));

function buildActor(creature, mapping) {
	const actor = {
		_key: `!actors!${foundryId(creature.name)}`,
		_id: foundryId(creature.name),
		name: creature.name,
		type: mapping.actorType,
		img: "icons/svg/mystery-man.svg",
		system: {},
		items: [],
		effects: [],
		folder: null,
		flags: {},
		ownership: { default: 0 },
		prototypeToken: {
			name: creature.name,
			displayName: 20,
			displayBars: 20,
			actorLink: false,
			texture: { src: "icons/svg/mystery-man.svg" },
		},
	};

	for (const [targetPath, value] of Object.entries(mapping.defaults ?? {})) {
		setProperty(actor, targetPath, value);
	}

	for (const attribute of creature.attributes ?? []) {
		if (attribute.type === "image") {
			const imagePath = `${systemImageBasePath}/${attribute.value.path}`;
			actor.img = imagePath;
			actor.prototypeToken.texture.src = imagePath;
			continue;
		}

		if (!attribute.name) continue;

		const directPath = mapping.directAttributes?.[attribute.name];
		if (directPath) {
			const value = numberIfNumeric(attribute.value);
			setProperty(actor, directPath, value);

			if (attribute.name === "Pv max") {
				setProperty(actor, "system.attributes.hp.value", value);
			}
		}

		const specialPath = mapping.specialAttributes?.[attribute.name];
		if (specialPath) {
			const value = mapping.statLabels?.[attribute.value] ?? attribute.value;
			setProperty(actor, specialPath, value);
		}
	}

	actor.system.description = buildDescription(creature, mapping);
	return actor;
}

function buildDescription(creature, mapping) {
	const descriptionNames = new Set(mapping.descriptionAttributes ?? []);
	const sections = [];

	for (const attribute of creature.attributes ?? []) {
		if (attribute.type === "text") {
			sections.push({ title: attribute.section ?? "Texte", value: textToHtml(attribute.value) });
			continue;
		}

		if (!attribute.name || !descriptionNames.has(attribute.name)) continue;

		sections.push({
			title: attribute.name,
			value: `<p>${escapeHtml(String(attribute.value))}</p>`,
		});
	}

	return sections
		.map(({ title, value }) => `<h2>${escapeHtml(title)}</h2>\n${value}`)
		.join("\n");
}

function textToHtml(value) {
	return String(value)
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => `<p>${escapeHtml(line)}</p>`)
		.join("\n");
}

function numberIfNumeric(value) {
	const number = Number(value);
	return Number.isFinite(number) && String(value).trim() !== "" ? number : value;
}

function setProperty(object, targetPath, value) {
	const parts = targetPath.split(".");
	const last = parts.pop();
	let target = object;

	for (const part of parts) {
		target[part] ??= {};
		target = target[part];
	}

	target[last] = value;
}

function foundryId(value) {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const hash = crypto.createHash("sha256").update(value).digest();
	let id = "";

	for (let index = 0; index < 16; index += 1) {
		id += alphabet[hash[index] % alphabet.length];
	}

	return id;
}

function slugify(value) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-zA-Z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.toLowerCase();
}

function escapeHtml(value) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
