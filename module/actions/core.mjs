export const createDefaultDamageFormula = () => ({
	formula: "",
	type: "none",
	stat: "none",
	effect: "damage",
});

export const createDefaultActionData = () => ({
	mode: "physical",
	weapon_usage: "normal",
	range_type: "ranged",
	requires: "",
	cost: {
		actions: {
			note: "",
			options: [
				{
					main: 1,
					bonus: 0,
					reaction: 0,
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
					enabled: false,
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
		stat: "physical",
		bonus: 0,
	},
	jds: {
		enabled: false,
		dd: 0,
		stat: "none",
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
		stat: "none",
		dd: 0,
		enemy_attack_bonus: 0,
	},
});
