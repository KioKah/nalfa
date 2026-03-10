import {
	getLabel,
	getStatBasedValue,
	getStatTotal,
	hasStat,
	postRollMessage,
	rollD20WithModifier,
} from "./shared.mjs";

export const rollSkill = async (actor, skillKey) => {
	if (!actor) return null;
	const skillObj = actor.system?.attributes?.skills?.[skillKey] ?? {};
	const skillName = getLabel(CONFIG.nalfa.skills, skillKey, skillKey);
	const statKey = skillObj.stat ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const modifier = getStatBasedValue(actor, skillObj);
	const { roll, dieResult, isCrit, isFumble } = await rollD20WithModifier(modifier);
	const titleLabel = "JdC";
	const statLabel = hasStat(statKey) ? ` (${statName})` : "";
	const titleName = `${skillName}${statLabel}`;
	const titleValue = roll.total;
	const skillTotal = Number(skillObj.value ?? modifier);
	const statTotal = hasStat(statKey) ? getStatTotal(actor, statKey) : 0;
	const baseSkill = hasStat(statKey) ? skillTotal - statTotal : skillTotal;
	const statDetail = hasStat(statKey) ? ` + ${statName} (${statTotal})` : "";
	const formulaText = `d20 [${dieResult ?? "-"}] + ${skillName} (${baseSkill}${statDetail})`;

	const rollData = {
		type: "skill",
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
	};

	await postRollMessage(actor, "skill", {
		actor,
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		isCrit,
		isFumble,
	});

	return rollData;
};
