const { enrichHTML: foundryEnrichHTML } = foundry.applications.ux.TextEditor;

export function round(value, decimals = 6) {
	return Number(Math.round(value * 10 ** decimals) / 10 ** decimals);
}
export function clamp(value, minValue, maxValue) {
	return Math.min(Math.max(value, minValue), maxValue);
}

export async function enrichHTML(string, owner) {
	if (string === undefined) return undefined;
	return await foundryEnrichHTML(string, {
		secrets: owner,
		async: true,
	});
}

export function prepareItem(sysData, itemType) {
	const prepareMap = {
		Weapon: () => {} /* Future implementation */,
		Trinket: () => {} /* Future implementation */,
		Tool: () => {} /* Future implementation */,
		Backpack: () => {} /* Future implementation */,
		Consumable: () => {} /* Future implementation */,
		Loot: () => {} /* Future implementation */,
		Book: () => {} /* Future implementation */,
		Spell: () => {} /* Future implementation */,
		Race: () => {} /* Future implementation */,
		Class: () => {} /* Future implementation */,
		Job: () => {} /* Future implementation */,
		CombatStyle: () => {} /* Future implementation */,
		Status: () => {} /* Future implementation */,
		WeaponAttribute: () => {} /* Future implementation */,
	};
	const prepare = prepareMap[itemType];

	if (prepare) {
		prepare(sysData);
	} else {
		console.error(`nalfa | NalfaItemSheet | Item type "${itemType}" not recognized.`);
	}
}
