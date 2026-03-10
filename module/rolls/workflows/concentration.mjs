import {
	getAttackName,
	getCompareSymbol,
	getLabel,
	getStatTotal,
	postRollMessage,
	promptEnemyAttackBonus,
	rollD20WithModifier,
} from "../core/shared.mjs";

export const rollConcentrationFromAction = async (
	actor,
	actionData = {},
	options = {},
) => {
	if (!actor) return null;

	const concentration = actionData?.concentration ?? {};
	const resolvedStatKey = options.statKey ?? concentration.stat ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, resolvedStatKey, resolvedStatKey);
	const attackerStatValue = await promptEnemyAttackBonus(
		options.enemyAttackBonus ?? concentration.enemy_attack_bonus ?? 0,
	);
	if (attackerStatValue === null) return null;

	const actorStatValue = resolvedStatKey ? getStatTotal(actor, resolvedStatKey) : 0;
	const modifier = actorStatValue - Number(attackerStatValue ?? 0);
	const { roll, dieResult, isCrit, isFumble } = await rollD20WithModifier(modifier);
	const targetDc = Number(options.dc ?? concentration.dd ?? 0);
	const isSuccess = Number(roll.total ?? 0) >= targetDc;
	const titleLabel = "JdF";
	const fallbackName = String(actionData?.name ?? "").trim() || "Action";
	const titleName = String(options.titleName ?? fallbackName).trim() || "Action";
	const titleValue = roll.total;
	const compareSymbol = getCompareSymbol(isSuccess);
	const attackerStatNumber = Math.max(0, Number(attackerStatValue ?? 0));
	const statPart = resolvedStatKey ? `${statName} (${actorStatValue})` : "Stat (?)";
	const formulaText =
		`d20 [${dieResult ?? "-"}] - ${attackerStatNumber} + ${statPart} ` +
		`${compareSymbol} DD ${targetDc}`;

	const rollData = {
		type: "concentration",
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
	};

	await postRollMessage(actor, "save", {
		actor,
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		hasTarget: true,
		isSuccess,
		isCrit,
		isFumble,
	});

	return rollData;
};

export const rollConcentration = async (actor, statKey, dc) => {
	if (!actor) return null;

	const attack = actor.system?.attack ?? {};
	const titleName = getAttackName(attack);
	return rollConcentrationFromAction(actor, attack, {
		statKey,
		dc,
		titleName,
	});
};
