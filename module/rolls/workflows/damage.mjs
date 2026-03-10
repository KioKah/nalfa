import {
	normalizeHalfMinimumFormula,
	toShortHalfMinimumFormula,
} from "../core/diceModifiers.mjs";
import {
	evaluateRoll,
	getAttackName,
	getFirstDieResult,
	getLabel,
	getStatTotal,
	hasStat,
	postRollMessage,
	resolveDamageFormula,
	resolveDamageType,
} from "../core/shared.mjs";

export const normalizeDamageFormula = (formula = "") => {
	return normalizeHalfMinimumFormula(formula);
};

export const rollDamage = async (actor, config = {}) => {
	if (!actor) return null;
	const rawFormula = (config.formula ?? "").trim();
	if (!rawFormula) return null;
	const resolvedFormula = resolveDamageFormula(rawFormula, actor);
	const normalizedFormula = normalizeDamageFormula(resolvedFormula);
	const shortFormula = toShortHalfMinimumFormula(normalizedFormula);
	const statKey = config.statKey ?? "";
	const statName =
		statKey === "physical"
			? getLabel(CONFIG.nalfa.attack_mode, "physical", "Physique")
			: getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const statValue =
		statKey === "physical"
			? Number(actor.system?.roll_stats?.physical?.value ?? 0)
			: (statKey ? getStatTotal(actor, statKey) : 0);
	const damageTypeKey = resolveDamageType(config.damageType, actor);
	const damageTypeLabel = getLabel(
		CONFIG.nalfa.all_damage_types,
		damageTypeKey,
		damageTypeKey,
	);
	const roll = await evaluateRoll(`${normalizedFormula} + @stat`, {
		stat: statValue,
	});
	const dieResult = getFirstDieResult(roll);
	const attack = actor.system?.attack ?? {};
	const weapon = actor.system?.weapon ?? {};
	const titleName = (config.titleName ?? getAttackName(attack, weapon)).trim() || "Attaque";
	const titleLabel = config.titleLabel ?? "JdD";
	const titleValue = roll.total;
	const damageSuffix = hasStat(statKey) ? ` + ${statName} (${statValue})` : "";
	const formulaText = `${shortFormula} [${dieResult ?? "-"}]${damageSuffix}`;

	await postRollMessage(actor, "damage", {
		actor,
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		damageTypeLabel,
	});

	return {
		roll,
		formulaText,
		damageTypeLabel,
	};
};

export const rollDamageSetFromAction = async (actor, actionData = {}, options = {}) => {
	if (!actor) return null;

	const jdd = actionData?.jdd ?? {};
	const fallbackName = String(actionData?.name ?? "").trim() || "Action";
	const titleName = String(options.titleName ?? fallbackName).trim() || "Action";
	const entries = (jdd.damage_formulas ?? []).map((entry) => ({
		formula: entry?.formula,
		statKey: entry?.stat,
		damageType: entry?.type,
	}));

	const results = [];
	for (const entry of entries) {
		const result = await rollDamage(actor, {
			...entry,
			titleLabel: "JdD",
			titleName,
		});
		if (result) results.push(result);
	}

	return results.length ? results : null;
};

export const rollDamageSet = async (actor) => {
	if (!actor) return null;

	const attack = actor.system?.attack ?? {};
	const titleName = getAttackName(attack);
	return rollDamageSetFromAction(actor, attack, { titleName });
};
