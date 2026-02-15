const HALF_MINIMUM_BY_FACES = new Map([
	[4, 2],
	[6, 3],
	[8, 4],
	[10, 5],
	[12, 6],
]);

const SUBSCRIPT_BY_MINIMUM = {
	2: "₂",
	3: "₃",
	4: "₄",
	5: "₅",
	6: "₆",
};

const getHalfMinimum = (faces) => {
	return HALF_MINIMUM_BY_FACES.get(Number(faces ?? 0));
};

export const normalizeHalfMinimumFormula = (formula = "") => {
	let normalized = String(formula ?? "").trim();
	const replacements = [
		{ sides: 12, min: 6 },
		{ sides: 10, min: 5 },
		{ sides: 8, min: 4 },
		{ sides: 6, min: 3 },
		{ sides: 4, min: 2 },
	];

	for (const { sides, min } of replacements) {
		const shortRegex = new RegExp(`d${sides}m(?![a-zA-Z0-9])`, "g");
		normalized = normalized.replace(shortRegex, `d${sides}min${min}`);
		const regex = new RegExp(`d${sides}(?!min|m|\\d)`, "g");
		normalized = normalized.replace(regex, `d${sides}min${min}`);
	}

	normalized = normalized.replace(/d(\d+)m(?![a-zA-Z0-9])/g, "d$1");

	return normalized;
};

export const toShortHalfMinimumFormula = (formula = "") => {
	return String(formula ?? "").replace(
		/d(4|6|8|10|12)min(2|3|4|5|6)/g,
		(_match, faces, min) => {
			const subscript = SUBSCRIPT_BY_MINIMUM[min] ?? min;
			return `d${faces}m${subscript}`;
		},
	);
};

export const registerHalfMinimumDiceModifier = () => {
	const Die = foundry?.dice?.terms?.Die;
	if (!Die) return;

	if (!Die.prototype.nalfaGetFormula) {
		const baseFormulaDescriptor = Object.getOwnPropertyDescriptor(
			Die.prototype,
			"formula",
		);
		Die.prototype.nalfaGetFormula = baseFormulaDescriptor?.get;
		if (Die.prototype.nalfaGetFormula) {
			Object.defineProperty(Die.prototype, "formula", {
				get() {
					const formula = this.nalfaGetFormula();
					const minimum = getHalfMinimum(this.faces);
					if (minimum) {
						return formula.replace(/m(?![a-zA-Z0-9])/g, `min${minimum}`);
					}
					return formula.replace(/m(?![a-zA-Z0-9])/g, "");
				},
			});
		}
	}

	if (!Die.prototype.nalfaHalfMinimum) {
		Die.prototype.nalfaHalfMinimum = function nalfaHalfMinimum() {
			const minimum = getHalfMinimum(this.faces);
			if (!minimum) return false;
			return this.minimum(`min${minimum}`);
		};
	}

	if (!Die.MODIFIERS.m) {
		Die.MODIFIERS.m = "nalfaHalfMinimum";
	}
};
