const buildDefaultArrayEntry = (entryType) => {
	switch (entryType) {
		case "damage-formula":
			return {
				formula: "",
				type: "none",
				stat: "none",
			};
		case "denomination":
			return {
				amount: 0,
				short_name: "",
				monetary_value: 1,
				weight_coefficient: 1,
				valid: false,
				value: null,
				weight: null,
			};
		case "modifier":
			return {
				category: "stats",
				path: "",
				mode: "add",
				value: 0,
			};
		default:
			return "";
	}
};

export const addArrayEntry = async (item, path, entryType = "string") => {
	const array = foundry.utils.deepClone(foundry.utils.getProperty(item.system, path) ?? []);
	array.push(buildDefaultArrayEntry(entryType));
	await item.update({ [`system.${path}`]: array });
};

export const removeArrayEntry = async (item, path, index, minimum = 0) => {
	const array = foundry.utils.deepClone(foundry.utils.getProperty(item.system, path) ?? []);
	if (array.length <= minimum) return;

	array.splice(index, 1);
	await item.update({ [`system.${path}`]: array });
};
