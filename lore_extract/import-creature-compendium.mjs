const SYSTEM_ID = "nalfa";
const BASE_PATH = `systems/${SYSTEM_ID}/lore_extract`;
const OUTPUT_PATH = `${BASE_PATH}/output.json`;
const MAPPING_PATH = `${BASE_PATH}/creature-mapping.json`;
const PACK_NAME = "creatures";
const PACK_LABEL = "Créatures";
const PACK_COLLECTION = `world.${PACK_NAME}`;

export async function importLoreCreatureCompendium() {
	if (!globalThis.game?.user?.isGM) {
		throw new Error("Only a GM can create or update compendium packs.");
	}

	const [pages, mapping] = await Promise.all([fetchJson(OUTPUT_PATH), fetchJson(MAPPING_PATH)]);
	const creatures = pages.filter((page) => page.template === mapping.creatureTemplate);
	const pack = await getOrCreatePack();

	await pack.getIndex({ fields: ["name", "type"] });

	let created = 0;
	let updated = 0;

	for (const creature of creatures) {
		const actorData = buildActorData(creature, mapping);
		const existing = pack.index.find(
			(entry) => entry.name === actorData.name && entry.type === mapping.actorType,
		);

		if (existing) {
			const document = await pack.getDocument(existing._id);
			await document.update(actorData);
			updated += 1;
		} else {
			await Actor.createDocuments([actorData], { pack: pack.collection });
			created += 1;
		}
	}

	ui.notifications.info(
		`Imported ${creatures.length} Lore creatures into ${PACK_LABEL} (${created} created, ${updated} updated).`,
	);

	return { pack: pack.collection, creatures: creatures.length, created, updated };
}

async function fetchJson(filePath) {
	const response = await fetch(filePath);
	if (!response.ok) throw new Error(`Failed to fetch ${filePath}: ${response.status}`);
	return response.json();
}

async function getOrCreatePack() {
	const existing = game.packs.get(PACK_COLLECTION);
	if (existing) return existing;

	return CompendiumCollection.createCompendium({
		name: PACK_NAME,
		label: PACK_LABEL,
		type: "Actor",
		package: "world",
	});
}

function buildActorData(creature, mapping) {
	const actorData = {
		name: creature.name,
		type: mapping.actorType,
		system: {},
	};

	for (const [path, value] of Object.entries(mapping.defaults ?? {})) {
		foundry.utils.setProperty(actorData, path, value);
	}

	for (const attribute of creature.attributes ?? []) {
		if (attribute.type === "image") {
			actorData.img = `${BASE_PATH}/${attribute.value.path}`;
			continue;
		}

		if (!attribute.name) continue;

		const directPath = mapping.directAttributes?.[attribute.name];
		if (directPath) {
			const value = numberIfNumeric(attribute.value);
			foundry.utils.setProperty(actorData, directPath, value);

			if (attribute.name === "Pv max") {
				foundry.utils.setProperty(actorData, "system.attributes.hp.value", value);
			}
		}

		const specialPath = mapping.specialAttributes?.[attribute.name];
		if (specialPath) {
			const value = mapping.statLabels?.[attribute.value] ?? attribute.value;
			foundry.utils.setProperty(actorData, specialPath, value);
		}
	}

	actorData.system.description = buildDescription(creature, mapping);
	return actorData;
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

function escapeHtml(value) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
