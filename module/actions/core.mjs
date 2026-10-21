export const createDefaultDamageFormula = () => ({
	formula: "",
	type: "none",
	stat: "pui",
	effect: "damage",
});

export const createDefaultActionData = () => ({
	weapon_usage: "normal",
	range_type: "ranged",
	requires: "",
	cost: {
		actions: {
			note: "",
			options: [
				{
					main: 1,
				secondary: 0,
				reaction: 0,
				interaction: 0,
					condition: "",
				},
			],
		},
		movement: {
			mode: "none",
			amount: 1,
			variable: "X",
		},
		nalfa: {
			amount: 0,
			category: "minor",
			overload: {
				enabled: false,
				amount: 0,
				effect: "",
				jdd: {
					mode: "same",
					damage_formulas: [createDefaultDamageFormula()],
				},
			},
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
			amount: "1",
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
		stat: "pui",
		bonus: 0,
	},
	jds: {
		enabled: false,
		dd: 0,
		stat: "vig",
		text: "",
		fails_on_save: false,
	},
	jdd: {
		enabled: false,
		damage_formulas: [createDefaultDamageFormula()],
	},
	jdd_saved: {
		enabled: false,
		mode: "same",
		damage_formulas: [createDefaultDamageFormula()],
	},
	concentration: {
		enabled: false,
		stat: "vig",
		dd: 0,
	},
});
