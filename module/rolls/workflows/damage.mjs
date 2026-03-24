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
	withActionSheetFlag,
} from "../core/shared.mjs";

const DAMAGE_GROUP_TEMPLATE = "systems/nalfa/templates/chat/roll/damage-grouped.hbs";
const DAMAGE_SUMMARY_TEMPLATE = "systems/nalfa/templates/chat/roll/damage-summary.hbs";
const DICE_TOKEN_REGEX = /\d*d\d+(?:(?:min)\d+|m[\d\u2080-\u2089]*|[a-z!][a-z0-9<>=!]*)*/gi;
const SUMMARY_BUCKET_LABELS = {
	damage: "Dégâts",
	healing: "Soin",
	abso: "Abso",
	piercing: "Perçant",
	ignored: "Ignoré",
};
const SUMMARY_FRACTIONS = [
	{ value: 0.125, glyph: "⅛" },
	{ value: 1 / 6, glyph: "⅙" },
	{ value: 0.2, glyph: "⅕" },
	{ value: 0.25, glyph: "¼" },
	{ value: 1 / 3, glyph: "⅓" },
	{ value: 0.375, glyph: "⅜" },
	{ value: 0.4, glyph: "⅖" },
	{ value: 0.5, glyph: "½" },
	{ value: 0.6, glyph: "⅗" },
	{ value: 0.625, glyph: "⅝" },
	{ value: 2 / 3, glyph: "⅔" },
	{ value: 0.75, glyph: "¾" },
	{ value: 0.8, glyph: "⅘" },
	{ value: 5 / 6, glyph: "⅚" },
	{ value: 0.875, glyph: "⅞" },
].map((entry) => ({
	...entry,
	min: entry.value - 0.015,
	max: entry.value + 0.015,
}));

const extractCritBonusFormula = (formula = "") => {
	const diceTerms = Array.from(String(formula ?? "").matchAll(DICE_TOKEN_REGEX))
		.map((match) => {
			return String(match?.[0] ?? "").trim();
		})
		.filter(Boolean);
	return diceTerms.join(" + ");
};

const formatSummaryAmount = (value) => {
	const number = Number(value ?? 0);
	if (!Number.isFinite(number)) return "0";
	if (Number.isInteger(number)) return String(number);
	return String(Math.round(number * 100) / 100);
};

const formatSummaryScalar = (value) => {
	const number = Number(value ?? 0);
	if (!Number.isFinite(number)) return "0";
	const sign = number < 0 ? "-" : "";
	const absoluteNumber = Math.abs(number);
	const fraction = SUMMARY_FRACTIONS.find((entry) => {
		return absoluteNumber >= entry.min && absoluteNumber <= entry.max;
	});
	if (fraction) return `${sign}${fraction.glyph}`;
	const rounded = Math.round(absoluteNumber * 100) / 100;
	const formatted = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
	return `${sign}${formatted
		.replace(/^0(?=\.)/, "")
		.replace(/(\.\d*?)0+$/, "$1")
		.replace(/\.$/, "")}`;
};

const getSummaryDamageTypeLabel = (damageTypeKey, damageTypeLabel) => {
	const normalizedKey = String(damageTypeKey ?? "none").trim() || "none";
	if (normalizedKey === "none") return "";
	void damageTypeLabel;
	return normalizedKey;
};

const getDamageSourceKind = (damageTypeKey) => {
	const normalizedKey = String(damageTypeKey ?? "none").trim() || "none";
	if (normalizedKey === "soin") return "healing";
	if (normalizedKey === "abso") return "abso";
	return "damage";
};

const getDefaultDamageEffect = (damageTypeKey) => {
	const sourceKind = getDamageSourceKind(damageTypeKey);
	if (sourceKind === "healing") return "healing";
	if (sourceKind === "abso") return "abso";
	return "damage";
};

const getResolvedDamageEffect = (effect, damageTypeKey) => {
	const normalizedEffect = String(effect ?? "").trim();
	return normalizedEffect || getDefaultDamageEffect(damageTypeKey);
};

const getDamageFormulaPrefix = (effect, damageTypeKey) => {
	const normalizedEffect = getResolvedDamageEffect(effect, damageTypeKey);
	return (
		CONFIG.nalfa?.damage_effect_prefixes?.[normalizedEffect] ??
		CONFIG.nalfa?.damage_effect_prefixes?.damage ??
		"Dégâts"
	);
};

const normalizeEffectCoefficient = (damageTypeKey, coefficient, resistanceValue) => {
	const normalizedKey = String(damageTypeKey ?? "none").trim() || "none";
	const numericCoefficient = Number.isFinite(Number(coefficient)) ? Number(coefficient) : 1;
	const numericResistanceValue = Math.max(0, Number(resistanceValue ?? 0));
	if (
		(normalizedKey === "soin" || normalizedKey === "abso") &&
		numericCoefficient === -1 &&
		numericResistanceValue === 0
	) {
		return 1;
	}
	return numericCoefficient;
};

const getAppliedEffectKind = (sourceKind, coefficient) => {
	if (sourceKind === "damage") return coefficient < 0 ? "healing" : "damage";
	if (sourceKind === "healing") return coefficient < 0 ? "damage" : "healing";
	if (sourceKind === "abso") return coefficient < 0 ? "damage" : "abso";
	if (sourceKind === "piercing") return coefficient < 0 ? "healing" : "piercing";
	return "damage";
};

const getSummaryBucketKey = (result) => {
	if (Number(result?.finalAmount ?? 0) === 0) return "ignored";
	const effectKind = String(result?.appliedEffectKind ?? "damage").trim() || "damage";
	if (effectKind === "piercing") return "piercing";
	if (effectKind === "healing") return "healing";
	if (effectKind === "abso") return "abso";
	return "damage";
};

const getDefaultResistanceCoefficient = (damageTypeKey) => {
	const normalizedKey = String(damageTypeKey ?? "none").trim() || "none";
	return normalizedKey === "soin" || normalizedKey === "abso" ? -1 : 1;
};

const formatSignedSummaryAmount = (value, unit) => {
	const number = Number(value ?? 0);
	if (!Number.isFinite(number) || number === 0) return "";
	const sign = number > 0 ? "+" : "-";
	return `${sign}${formatSummaryAmount(Math.abs(number))} ${unit}`;
};

const buildSummaryPart = (value, unit) => {
	const number = Number(value ?? 0);
	if (!Number.isFinite(number) || number === 0) return null;
	return {
		amount: `${number > 0 ? "+" : "-"}${formatSummaryAmount(Math.abs(number))}`,
		unit,
	};
};

const evaluateMaxRoll = async (formula, data = {}) => {
	const roll = new Roll(formula, data);
	await roll.evaluate({ maximize: true });
	return roll;
};

const formatSummaryPart = (result) => {
	const coefficient = Number(result?.effectiveCoefficient ?? result?.coefficient ?? 1);
	const resistanceValue = Math.max(0, Number(result?.resistanceValue ?? 0));
	let expression = formatSummaryAmount(Math.abs(Number(result?.baseAmount ?? 0)));
	if (coefficient !== 1) expression = `${formatSummaryScalar(coefficient)}·${expression}`;
	if (resistanceValue > 0)
		expression = `${expression}-${formatSummaryAmount(resistanceValue)}`;
	return expression;
};

const getUsedResistanceValues = (resistance, defaultCoefficient = 1) => ({
	coefficient: Number.isFinite(Number(resistance?.used_coef))
		? Number(resistance.used_coef)
		: (Number.isFinite(Number(resistance?.coef))
				? Number(resistance.coef)
				: defaultCoefficient) *
			(Number.isFinite(Number(resistance?.alt_mult)) ? Number(resistance.alt_mult) : 1),
	value: Number.isFinite(Number(resistance?.used_value))
		? Number(resistance.used_value)
		: (Number.isFinite(Number(resistance?.value)) ? Number(resistance.value) : 0) +
			(Number.isFinite(Number(resistance?.alt)) ? Number(resistance.alt) : 0),
});

const getResistanceProfile = (actor, damageTypeKey) => {
	const normalizedDamageTypeKey = String(damageTypeKey ?? "none").trim() || "none";
	const fusionComponents =
		CONFIG.nalfa?.fusion_damage_type_components?.[normalizedDamageTypeKey];
	const resistanceMap = actor?.system?.attributes?.resistances ?? {};

	if (!Array.isArray(fusionComponents) || fusionComponents.length === 0) {
		const resistance = resistanceMap[normalizedDamageTypeKey] ?? null;
		const usedValues = getUsedResistanceValues(
			resistance,
			getDefaultResistanceCoefficient(normalizedDamageTypeKey),
		);
		return {
			coefficient: usedValues.coefficient,
			value: Math.max(0, usedValues.value),
			isFusion: false,
		};
	}

	const resistanceEntries = fusionComponents.map((componentKey) => {
		const resistance = resistanceMap[componentKey] ?? null;
		const usedValues = getUsedResistanceValues(resistance, 1);
		return {
			coefficient: usedValues.coefficient,
			value: Math.max(0, usedValues.value),
		};
	});
	const meanCoefficient =
		resistanceEntries.reduce((sum, entry) => sum + entry.coefficient, 0) /
		resistanceEntries.length;
	const meanValue =
		resistanceEntries.reduce((sum, entry) => sum + entry.value, 0) /
		resistanceEntries.length;

	return {
		coefficient: meanCoefficient,
		value: meanCoefficient === 0 ? 0 : meanValue,
		isFusion: true,
	};
};

export const normalizeDamageFormula = (formula = "") => {
	return normalizeHalfMinimumFormula(formula);
};

const evaluateDamageEntry = async (actor, config = {}) => {
	const rawFormula = (config.formula ?? "").trim();
	if (!rawFormula) return null;

	const resolvedFormula = resolveDamageFormula(rawFormula, actor);
	const normalizedFormula = normalizeDamageFormula(resolvedFormula);
	const diceOnly = config.diceOnly === true;
	const rollFormula = diceOnly
		? extractCritBonusFormula(normalizedFormula)
		: normalizedFormula;
	if (diceOnly) {
		console.log("nalfa | Crit damage debug | extracted dice formula", {
			rawFormula,
			resolvedFormula,
			normalizedFormula,
			rollFormula,
		});
	}
	if (!rollFormula) return null;
	const shortFormula = toShortHalfMinimumFormula(rollFormula);
	const includeStat = config.includeStat !== false;
	const statKey = config.statKey ?? "";
	const statName =
		statKey === "physical"
			? getLabel(CONFIG.nalfa.attack_mode, "physical", "Physique")
			: getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const statValue =
		statKey === "physical"
			? Number(actor.system?.roll_stats?.physical?.value ?? 0)
			: statKey
				? getStatTotal(actor, statKey)
				: 0;
	const damageTypeKey = resolveDamageType(config.damageType, actor);
	const damageTypeLabel = getLabel(
		CONFIG.nalfa.all_damage_types,
		damageTypeKey,
		damageTypeKey,
	);
	const effect = getResolvedDamageEffect(config.effect, damageTypeKey);
	const formulaPrefix = getDamageFormulaPrefix(config.effect, damageTypeKey);
	const roll = includeStat
		? await evaluateRoll(`${rollFormula} + @stat`, {
				stat: statValue,
			})
		: await evaluateRoll(rollFormula, {});
	const maxRoll = includeStat
		? await evaluateMaxRoll(`${rollFormula} + @stat`, {
				stat: statValue,
			})
		: await evaluateMaxRoll(rollFormula, {});
	const dieResult = getFirstDieResult(roll);
	const damageSuffix =
		includeStat && hasStat(statKey) ? ` + ${statName} (${statValue})` : "";
	const formulaText = `${formulaPrefix} : ${shortFormula} [${dieResult ?? "-"}]${damageSuffix}`;
	const titleValue = Math.max(0, Number(roll.total ?? 0));
	const maxTitleValue = Math.max(0, Number(maxRoll.total ?? 0));

	return {
		roll,
		formulaText,
		damageTypeKey,
		damageTypeLabel,
		effect,
		titleValue,
		maxTitleValue,
	};
};

export const rollDamage = async (actor, config = {}) => {
	if (!actor) return null;
	const messageOptions = withActionSheetFlag(
		config.messageOptions ?? {},
		config.chatContext,
	);
	const attack = actor.system?.attack ?? {};
	const weapon = actor.system?.weapon ?? {};
	const titleName = (config.titleName ?? getAttackName(attack, weapon)).trim() || "Attaque";
	const titleLabel = config.titleLabel ?? "JdD";
	const result = await evaluateDamageEntry(actor, config);
	if (!result) return null;

	await postRollMessage(
		actor,
		"damage",
		{
			actor,
			roll: result.roll,
			titleLabel,
			titleName,
			titleValue: result.titleValue,
			formulaText: result.formulaText,
			damageTypeLabel: result.damageTypeLabel,
		},
		messageOptions,
	);

	return {
		...result,
	};
};

export const rollDamageEntries = async (actor, entries = [], options = {}) => {
	if (!actor) return [];

	const results = [];
	for (const entry of entries) {
		const result = await evaluateDamageEntry(actor, {
			formula: entry?.formula,
			statKey: entry?.statKey,
			damageType: entry?.damageType,
			effect: entry?.effect,
			includeStat: options.includeStat,
			diceOnly: options.diceOnly,
		});
		if (result) results.push(result);
	}

	return results;
};

export const postDamageGroupMessage = async (
	actor,
	{
		titleLabel = "JdD",
		titleName = "",
		results = [],
		messageOptions = {},
		chatContext = null,
	} = {},
) => {
	if (!actor || !results.length) return null;

	const content = await foundry.applications.handlebars.renderTemplate(
		DAMAGE_GROUP_TEMPLATE,
		{
			titleLabel,
			titleName,
			rows: results.map((result) => ({
				total: result.titleValue,
				damageTypeLabel: result.damageTypeLabel,
				formulaText: result.formulaText,
			})),
		},
	);

	return ChatMessage.create({
		user: game.user.id,
		speaker: ChatMessage.getSpeaker({ actor }),
		content,
		rolls: results.map((result) => result.roll),
		sound: CONFIG.sounds.dice,
		...withActionSheetFlag(messageOptions, chatContext),
	});
};

const applyDamageModifier = (actor, damageResult) => {
	const baseAmount = Number(damageResult?.titleValue ?? 0);
	const maxBaseAmount = Number(damageResult?.maxTitleValue ?? baseAmount);
	const damageTypeKey = String(damageResult?.damageTypeKey ?? "none").trim() || "none";
	const damageTypeLabel =
		String(damageResult?.damageTypeLabel ?? "").trim() || damageTypeKey;
	const sourceKind = getResolvedDamageEffect(damageResult?.effect, damageTypeKey);
	const defaultAppliedEffectKind = getAppliedEffectKind(sourceKind, 1);

	if (damageTypeKey === "none") {
		const hpDelta =
			defaultAppliedEffectKind === "damage" || defaultAppliedEffectKind === "piercing"
				? -baseAmount
				: defaultAppliedEffectKind === "healing"
					? baseAmount
					: 0;
		const tempHpDelta = defaultAppliedEffectKind === "abso" ? baseAmount : 0;
		return {
			sourceKind,
			appliedEffectKind: defaultAppliedEffectKind,
			damageTypeKey,
			damageTypeLabel,
			baseAmount,
			maxBaseAmount,
			coefficient: 1,
			effectiveCoefficient: 1,
			resistanceValue: 0,
			finalAmount: baseAmount,
			maxFinalAmount: maxBaseAmount,
			hpDelta,
			tempHpDelta,
			note: "",
		};
	}

	const resistanceProfile = getResistanceProfile(actor, damageTypeKey);
	const coefficient = resistanceProfile.coefficient;
	const effectiveCoefficient = normalizeEffectCoefficient(
		damageTypeKey,
		coefficient,
		resistanceProfile.value,
	);
	const resistanceValue = resistanceProfile.value;
	const scaledAmount = Math.abs(baseAmount * effectiveCoefficient);
	const scaledMaxAmount = Math.abs(maxBaseAmount * effectiveCoefficient);
	const finalAmount = Math.max(0, scaledAmount - resistanceValue);
	const maxFinalAmount = Math.max(0, scaledMaxAmount - resistanceValue);
	const appliedEffectKind = getAppliedEffectKind(sourceKind, effectiveCoefficient);
	const hpDelta =
		appliedEffectKind === "damage" || appliedEffectKind === "piercing"
			? -finalAmount
			: appliedEffectKind === "healing"
				? finalAmount
				: 0;
	const tempHpDelta = appliedEffectKind === "abso" ? finalAmount : 0;

	const notes = [];
	if (effectiveCoefficient !== 1) notes.push(`Coef ${effectiveCoefficient}`);
	if (resistanceValue > 0) notes.push(`Valeur ${resistanceValue}`);

	return {
		sourceKind,
		appliedEffectKind,
		damageTypeKey,
		damageTypeLabel,
		baseAmount,
		maxBaseAmount,
		coefficient,
		effectiveCoefficient,
		resistanceValue,
		finalAmount,
		maxFinalAmount,
		hpDelta,
		tempHpDelta,
		note: notes.join(", "),
	};
};

export const summarizeAppliedDamageForToken = (
	token,
	damageResults = [],
	{ mode = "normal" } = {},
) => {
	const appliedResults = damageResults.map((result) =>
		applyDamageModifier(token?.actor, result),
	);
	const currentHp = Number(token?.actor?.system?.attributes?.hp?.value ?? 0);
	const maxHp = Number(token?.actor?.system?.attributes?.hp?.max ?? NaN);
	const currentTempHp = Math.max(
		0,
		Number(token?.actor?.system?.attributes?.hp?.abso ?? 0),
	);
	let resultingHp = currentHp;
	let finalTempHp = currentTempHp;
	const detailSegments = [];

	for (const result of appliedResults) {
		const bucketKey = getSummaryBucketKey(result);
		let segment = detailSegments.at(-1);
		if (!segment || segment.bucketKey !== bucketKey) {
			segment = {
				bucketKey,
				entries: new Map(),
				order: [],
				attemptedAmount: 0,
				startHp: resultingHp,
				endHp: resultingHp,
				startTempHp: finalTempHp,
				endTempHp: finalTempHp,
			};
			detailSegments.push(segment);
		}

		const typeKey = String(result.damageTypeKey ?? "none").trim() || "none";
		if (!segment.entries.has(typeKey)) {
			segment.entries.set(typeKey, {
				label: getSummaryDamageTypeLabel(typeKey, result.damageTypeLabel),
				parts: [],
			});
			segment.order.push(typeKey);
		}
		segment.entries.get(typeKey).parts.push(formatSummaryPart(result));

		const appliedAmount =
			mode === "half"
				? Math.trunc(Number(result.finalAmount ?? 0) / 2)
				: Number(result.finalAmount ?? 0);
		const appliedMaxAmount =
			mode === "half"
				? Math.trunc(Number(result.maxFinalAmount ?? 0) / 2)
				: Number(result.maxFinalAmount ?? 0);

		if (bucketKey === "healing" || bucketKey === "abso") {
			segment.attemptedAmount += appliedAmount;
		}

		if (result.appliedEffectKind === "damage") {
			const absorbed = Math.min(finalTempHp, appliedAmount);
			finalTempHp -= absorbed;
			resultingHp -= Math.max(0, appliedAmount - absorbed);
			segment.endHp = resultingHp;
			segment.endTempHp = finalTempHp;
			continue;
		}

		if (result.appliedEffectKind === "piercing") {
			resultingHp -= appliedAmount;
			segment.endHp = resultingHp;
			segment.endTempHp = finalTempHp;
			continue;
		}

		if (result.appliedEffectKind === "healing") {
			resultingHp += appliedAmount;
			if (Number.isFinite(maxHp)) resultingHp = Math.min(resultingHp, maxHp);
			segment.endHp = resultingHp;
			segment.endTempHp = finalTempHp;
			continue;
		}

		if (result.appliedEffectKind === "abso") {
			if (appliedMaxAmount > 0) {
				finalTempHp =
					finalTempHp >= appliedMaxAmount
						? finalTempHp
						: Math.max(0, Math.min(finalTempHp + appliedAmount, appliedMaxAmount));
			} else {
				finalTempHp = Math.max(0, finalTempHp + appliedAmount);
			}
			segment.endHp = resultingHp;
			segment.endTempHp = finalTempHp;
		}
	}

	const hpDelta = resultingHp - currentHp;
	const tempHpDelta = finalTempHp - currentTempHp;
	const detailLines = detailSegments
		.map((segment) => {
			const entries = segment.order
				.map((typeKey) => segment.entries.get(typeKey))
				.filter(Boolean);
			if (!entries.length) return "";
			const prefix = `${SUMMARY_BUCKET_LABELS[segment.bucketKey]} : `;
			const body = entries
				.map((entry) => {
					const amount = entry.parts.join("+");
					return entry.label ? `${amount} ${entry.label}` : amount;
				})
				.join(" | ");
			const halfSuffix = mode === "half" ? " => /2" : "";
			let clampSuffix = "";
			if (segment.bucketKey === "healing") {
				const applied = Math.max(0, segment.endHp - segment.startHp);
				if (applied < segment.attemptedAmount) {
					clampSuffix = ` => ${formatSummaryAmount(applied)} (cap)`;
				}
			} else if (segment.bucketKey === "abso") {
				const applied = Math.max(0, segment.endTempHp - segment.startTempHp);
				if (applied < segment.attemptedAmount) {
					clampSuffix = ` => ${formatSummaryAmount(applied)} (cap)`;
				}
			}
			return `${prefix}${body}${halfSuffix}${clampSuffix}`;
		})
		.filter(Boolean);
	const summaryParts = [
		buildSummaryPart(Math.max(0, hpDelta), "PV"),
		buildSummaryPart(Math.min(0, tempHpDelta), "PVtemp"),
		buildSummaryPart(Math.min(0, hpDelta), "PV"),
		buildSummaryPart(Math.max(0, tempHpDelta), "PVtemp"),
	].filter(Boolean);
	if (!summaryParts.length) {
		summaryParts.push({ amount: "0", unit: "PV" });
	}

	return {
		targetName: String(token?.name ?? token?.document?.name ?? "Cible").trim() || "Cible",
		targetActorUuid: String(token?.actor?.uuid ?? "").trim(),
		previousHp: currentHp,
		nextHp: resultingHp,
		previousTempHp: currentTempHp,
		nextTempHp: finalTempHp,
		hpDelta,
		tempHpDelta,
		finalTempHp,
		summaryParts,
		isKo: hpDelta < 0 && resultingHp <= 0,
		isDead: hpDelta < 0 && Number.isFinite(maxHp) && maxHp > 0 && resultingHp <= -maxHp,
		detailLines,
	};
};

export const postDamageSummaryMessage = async (
	actor,
	{ titleName = "", rows = [], messageOptions = {}, chatContext = null } = {},
) => {
	if (!actor || !rows.length) return null;
	const mergedMessageOptions = withActionSheetFlag(messageOptions, chatContext);
	const damageSummaryRows = rows
		.map((row) => ({
			targetActorUuid: String(row?.targetActorUuid ?? "").trim(),
			previousHp: Number.isFinite(Number(row?.previousHp)) ? Number(row.previousHp) : 0,
			nextHp: Number.isFinite(Number(row?.nextHp)) ? Number(row.nextHp) : 0,
			previousTempHp: Number.isFinite(Number(row?.previousTempHp))
				? Number(row.previousTempHp)
				: 0,
			nextTempHp: Number.isFinite(Number(row?.nextTempHp)) ? Number(row.nextTempHp) : 0,
		}))
		.filter((row) => row.targetActorUuid);

	const content = await foundry.applications.handlebars.renderTemplate(
		DAMAGE_SUMMARY_TEMPLATE,
		{
			titleName,
			rows,
		},
	);

	const message = await ChatMessage.create({
		...mergedMessageOptions,
		user: game.user.id,
		speaker: ChatMessage.getSpeaker({ actor }),
		content,
	});
	if (message && damageSummaryRows.length) {
		await message.setFlag("nalfa", "damageSummary", {
			reverted: false,
			rows: damageSummaryRows,
		});
	}
	return message;
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
		effect: entry?.effect,
	}));

	const results = [];
	for (const entry of entries) {
		const result = await rollDamage(actor, {
			...entry,
			titleLabel: "JdD",
			titleName,
			messageOptions: options.messageOptions,
			chatContext: options.chatContext,
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
