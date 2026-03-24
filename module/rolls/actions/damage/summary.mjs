import { summarizeAppliedDamageForToken } from "../../index.mjs";

export const getActionDamageEntries = (damageFormulas = []) => {
	return damageFormulas
		.map((entry) => ({
			formula: String(entry?.formula ?? "").trim(),
			statKey: String(entry?.stat ?? "none").trim() || "none",
			damageType: String(entry?.type ?? "none").trim() || "none",
			effect: String(entry?.effect ?? "damage").trim() || "damage",
		}))
		.filter((entry) => entry.formula || entry.statKey !== "none");
};

export const getActionSavedDamageMode = (actionData) => {
	return String(actionData?.jdd_saved?.mode ?? "same");
};

export const getSavedDamageEntries = (actionData) => {
	return getActionDamageEntries(actionData?.jdd_saved?.damage_formulas ?? []);
};

export const buildDamageSummaryRows = ({
	targets = [],
	damageResults = [],
	mode = "normal",
}) => {
	return targets.map((targetToken) => {
		const summary = summarizeAppliedDamageForToken(targetToken, damageResults, { mode });
		return {
			targetToken,
			targetName: summary.targetName,
			targetActorUuid: summary.targetActorUuid,
			previousHp: summary.previousHp,
			nextHp: summary.nextHp,
			previousTempHp: summary.previousTempHp,
			nextTempHp: summary.nextTempHp,
			hpDelta: summary.hpDelta,
			tempHpDelta: summary.tempHpDelta,
			finalTempHp: summary.finalTempHp,
			summaryParts: summary.summaryParts,
			isKo: summary.isKo,
			isDead: summary.isDead,
			detailLines: summary.detailLines,
		};
	});
};

export const combineDamageResults = (baseResults = [], critResults = []) => {
	const combined = [];
	const normalizedBaseResults = Array.isArray(baseResults) ? baseResults : [];
	const normalizedCritResults = Array.isArray(critResults) ? critResults : [];
	const length = Math.max(normalizedBaseResults.length, normalizedCritResults.length);

	for (let index = 0; index < length; index += 1) {
		const baseResult = normalizedBaseResults[index];
		const critResult = normalizedCritResults[index];
		if (baseResult) combined.push(baseResult);
		if (critResult) combined.push(critResult);
	}

	return combined;
};

export const actionHasHealingDamage = (actionData) => {
	const baseEntries = getActionDamageEntries(actionData?.jdd?.damage_formulas ?? []);
	const savedEntries = getSavedDamageEntries(actionData);
	return [...baseEntries, ...savedEntries].some((entry) => {
		return String(entry?.effect ?? "").trim() === "healing"
			|| String(entry?.damageType ?? "none").trim() === "soin";
	});
};
