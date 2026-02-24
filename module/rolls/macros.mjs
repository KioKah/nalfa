import {
	rollAttack,
	rollDamageSet,
	rollInitiative,
	rollSkill,
} from "./rolls.mjs";

const getMacroActor = () => {
	return (
		canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null
	);
};

const ensureActor = () => {
	const actor = getMacroActor();
	if (!actor) {
		ui.notifications.warn("Aucun acteur sélectionné.");
	}
	return actor;
};

export const rollSkillMacro = async (skillKey) => {
	const actor = ensureActor();
	if (!actor) return null;
	if (!skillKey) {
		ui.notifications.warn("Choisis une compétence (ex: 'athlet').");
		return null;
	}
	return rollSkill(actor, skillKey);
};

export const rollInitiativeMacro = async () => {
	const actor = ensureActor();
	if (!actor) return null;
	return rollInitiative(actor);
};

export const rollBasicAttackMacro = async () => {
	const actor = ensureActor();
	if (!actor) return null;
	return rollAttack(actor, "physical");
};

export const rollBasicDamageMacro = async () => {
	const actor = ensureActor();
	if (!actor) return null;
	return rollDamageSet(actor);
};
