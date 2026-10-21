import { getAttackName, getLabel, withActionSheetFlag } from "../core/shared.mjs";
import { rollSaveTarget } from "./save.mjs";
import { getActorStateProfile } from "../../rules/states.mjs";

export const rollConcentrationFromAction = async (actor, actionData = {}, options = {}) => {
	if (!actor) return null;
	const stateProfile = getActorStateProfile(actor);
	if (stateProfile.blocksAction || stateProfile.blocksConcentration) {
		ui.notifications.warn("Un état empêche ce personnage de se concentrer.");
		return null;
	}

	const concentration = actionData?.concentration ?? {};
	const requestedStatKey = options.statKey ?? concentration.stat ?? "vig";
	const statKey = CONFIG.nalfa.save_stats?.[requestedStatKey] ? requestedStatKey : "vig";
	const fallbackName = String(actionData?.name ?? "").trim() || "Action";
	const titleName = String(options.titleName ?? fallbackName).trim() || "Action";
	const dc = Number(options.dc ?? concentration.dd ?? 0);

	return rollSaveTarget(actor, statKey, dc, titleName, {
		...options,
		statName: getLabel(CONFIG.nalfa.stats, statKey, statKey),
		titleLabel: "JdF",
		messageOptions: withActionSheetFlag(options.messageOptions ?? {}, options.chatContext),
	});
};

export const rollConcentration = async (actor, statKey, dc, options = {}) => {
	if (!actor) return null;

	const attack = actor.system?.attack ?? {};
	return rollConcentrationFromAction(actor, attack, {
		statKey,
		dc,
		titleName: getAttackName(attack),
		...options,
	});
};
