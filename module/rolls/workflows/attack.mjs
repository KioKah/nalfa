import {
	getCompareSymbol,
	getD20RollDetail,
	formatRollAdjustment,
	formatStatSuffix,
	getAttackName,
	getLabel,
	getStatTotal,
	postRollMessage,
	rollD20WithModifier,
	withActionSheetFlag,
} from "../core/shared.mjs";
import { getFatigueEffects } from "../../rules/fatigue.mjs";
import { getActorStateProfile } from "../../rules/states.mjs";

export const rollAttackFromAction = async (actor, actionData = {}, options = {}) => {
	if (!actor) return null;
	const stateProfile = getActorStateProfile(actor);
	if (stateProfile.blocksAction || stateProfile.blocksAttack) {
		ui.notifications.warn("Un état empêche ce personnage d'attaquer.");
		return null;
	}
	const messageOptions = withActionSheetFlag(
		options.messageOptions ?? {},
		options.chatContext,
	);

	const jdt = actionData?.jdt ?? {};
	const statKey = jdt.stat === "none" ? "none" : "pui";
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const statValue = statKey ? getStatTotal(actor, statKey) : 0;
	const bonusValue = Number(jdt.bonus ?? 0);
	const fatigue = getFatigueEffects(
		actor.type === "Character" ? actor.system.attributes?.exhaustion : 0,
	);
	const modifier = statValue + bonusValue + fatigue.attackPenalty;
	const rollResult = await rollD20WithModifier(modifier, {
		promptAdjustments: options.promptAdjustments,
		typeLabel: "JdT",
	});
	if (!rollResult) return null;
	const { roll, dieResult, isCrit, isFumble } = rollResult;
	const fallbackName = String(actionData?.name ?? "").trim() || "Action";
	const titleLabel = "JdT";
	const titleName = String(options.titleName ?? fallbackName).trim() || "Action";
	const targetDefense = Number(options.targetDefense ?? NaN);
	const hasTarget = Number.isFinite(targetDefense);
	const isSuccess = hasTarget
		? isCrit || (!isFumble && Number(roll.total ?? 0) >= targetDefense)
		: null;
	const attackSuffix = formatStatSuffix(statKey, statName, modifier, bonusValue);
	const adjustmentSuffix = formatRollAdjustment(rollResult.customBonus);
	const isNatural = isCrit || isFumble;
	const naturalOutcome = isCrit ? "Réussite automatique" : "Échec automatique";
	const rollMode = rollResult.rollMode;
	const naturalTitle = isCrit
		? rollMode === "disadvantage"
			? "20 Naturel !!"
			: "20 Naturel !"
		: rollMode === "advantage"
			? "1 Naturel ?!"
			: "1 Naturel...";
	const detailPrefix = `${attackSuffix}${adjustmentSuffix}`;
	const comparison = hasTarget
		? `${getCompareSymbol(isSuccess)} Défense ${targetDefense}`
		: "";
	const rollDetail = getD20RollDetail(roll, detailPrefix, {
		isCrit,
		isFumble,
		modifier: rollResult.modifier,
		comparison,
	});
	const titleValue = isNatural ? naturalTitle : Number(roll.total ?? 0);
	const formulaText = isNatural
		? `d20 [${dieResult}] · ${naturalOutcome}`
		: hasTarget
			? `d20 [${dieResult ?? "-"}]${attackSuffix}${adjustmentSuffix} ` +
				`${getCompareSymbol(isSuccess)} ` +
				`Défense ${targetDefense}`
			: `d20 [${dieResult ?? "-"}]${attackSuffix}${adjustmentSuffix}`;

	const rollData = {
		type: "attack",
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		rollDetail,
		hasTarget,
		isSuccess,
		isCrit,
		isFumble,
	};

	await postRollMessage(
		actor,
		"attack",
		{
			actor,
			roll,
			titleLabel,
			titleName,
			titleValue,
			formulaText,
			rollDetail,
			hasTarget,
			isSuccess,
			versusName: String(options.versusName ?? "").trim(),
			isCrit,
			isFumble,
		},
		messageOptions,
	);

	return rollData;
};

export const rollAttack = async (actor, options = {}) => {
	if (!actor) return null;

	const attack = actor.system?.attack ?? {};
	const weapon = actor.system?.weapon ?? {};
	const titleName = getAttackName(attack, weapon);
	return rollAttackFromAction(actor, attack, { titleName, ...options });
};
