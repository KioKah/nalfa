import {
	getLabel,
	getD20RollDetail,
	formatRollAdjustment,
	getStatBasedValue,
	getStatTotal,
	hasStat,
	postRollMessage,
	rollD20WithModifier,
} from "../core/shared.mjs";

export const rollSkill = async (actor, skillKey, options = {}) => {
	if (!actor) return null;
	const skillObj = actor.system?.attributes?.skills?.[skillKey] ?? {};
	const skillName = getLabel(CONFIG.nalfa.skills, skillKey, skillKey);
	const statKey = skillObj.stat ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const modifier = getStatBasedValue(actor, skillObj);
	const rollResult = await rollD20WithModifier(modifier, {
		promptAdjustments: options.promptAdjustments,
		typeLabel: "JdC",
	});
	if (!rollResult) return null;
	const { roll, dieResult, isCrit, isFumble } = rollResult;
	const titleLabel = "JdC";
	const statLabel = hasStat(statKey) ? ` (${statName})` : "";
	const titleName = `${skillName}${statLabel}`;
	const titleValue = roll.total;
	const skillTotal = Number(skillObj.value ?? modifier);
	const statTotal = hasStat(statKey) ? getStatTotal(actor, statKey) : 0;
	const baseSkill = hasStat(statKey) ? skillTotal - statTotal : skillTotal;
	const statDetail = hasStat(statKey) ? ` + ${statName} (${statTotal})` : "";
	const adjustmentSuffix = formatRollAdjustment(rollResult.customBonus);
	const skillSuffix = `+ ${skillName} (${baseSkill}${statDetail})${adjustmentSuffix}`;
	const formulaText = `d20 [${dieResult ?? "-"}] ${skillSuffix}`;
	const rollDetail = getD20RollDetail(
		roll,
		skillSuffix,
		{ modifier: rollResult.modifier },
	);

	const rollData = {
		type: "skill",
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		rollDetail,
	};

	await postRollMessage(actor, "skill", {
		actor,
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		rollDetail,
		isCrit,
		isFumble,
	});

	return rollData;
};
