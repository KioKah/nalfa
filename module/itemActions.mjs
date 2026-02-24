export const MAX_ITEM_ACTIONS = 3;

export const createDefaultDamageFormula = () => ({
	formula: "",
	type: "none",
	stat: "none",
});

export const createDefaultActionData = () => ({
	mode: "physical",
	range_type: "ranged",
	requires: "",
	cost: {
		action: {
			amount: 1,
			unit: "main",
		},
		ester: {
			amount: 0,
			unit: "none",
		},
		uses: {
			value: null,
			max: null,
			unit: "none",
		},
		cooldown: {
			amount: 0,
			unit: "none",
		},
	},
	selection: {
		target: {
			amount: 1,
			unit: "enemy",
			visibility: "visible",
			include_self: false,
		},
		zone: {
			shape: "circle",
			range_secondary: 0,
			range: 0,
			min_range: 0,
			long_range: 0,
			has_long_range: false,
		},
	},
	effect: {
		text: "",
	},
	jdt: {
		enabled: false,
		stat: "physical",
		bonus: 0,
	},
	jds: {
		enabled: false,
		dd: 0,
		stat: "none",
		text: "",
		jdd_saved: false,
	},
	jdd: {
		enabled: false,
		damage_formulas: [createDefaultDamageFormula()],
	},
	jdd_saved: {
		enabled: false,
		damage_formulas: [createDefaultDamageFormula()],
	},
	concentration: {
		enabled: false,
		stat: "none",
		dd: 0,
		enemy_attack_bonus: 0,
	},
});

export const createDefaultItemAction = ({ name = "" } = {}) => ({
	name,
	...createDefaultActionData(),
});

export const getDefaultItemActionName = (itemName, index) => {
	const baseName = String(itemName ?? "").trim();
	const fallbackName = "Action";
	const resolvedBaseName = baseName || fallbackName;

	if (index <= 0) return resolvedBaseName;
	return `${resolvedBaseName} ${index + 1}`;
};
