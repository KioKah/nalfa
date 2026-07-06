const SUBSCRIPT_BY_MINIMUM = {
	2: "₂",
	3: "₃",
	4: "₄",
	5: "₅",
	6: "₆",
};

const getHalfMinimum = (faces) => {
	const faceCount = Number(faces ?? 0);
	if (!Number.isInteger(faceCount) || faceCount <= 0) return null;
	return Math.ceil(faceCount / 2);
};

export const normalizeHalfMinimumFormula = (formula = "") => {
	let normalized = String(formula ?? "").trim();
	normalized = normalized.replace(/d(\d+)m(?![a-zA-Z0-9])/g, (_match, faces) => {
		const minimum = getHalfMinimum(faces);
		return minimum ? `d${faces}min${minimum}` : `d${faces}`;
	});

	return normalized;
};

export const toShortHalfMinimumFormula = (formula = "") => {
	return String(formula ?? "").replace(
		/d(\d+)min(\d+)/g,
		(_match, faces, min) => {
			if (Number(min) !== getHalfMinimum(faces)) return _match;
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
