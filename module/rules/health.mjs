import { getFatigueEffects, normalizeFatigue } from "./fatigue.mjs";
import {
	buildNalfaStateEffect,
	getActorStateEffects,
	KO_DEATH_STATUS_ID,
} from "./states.mjs";

const isHealthKoEffect = (effect) => effect.flags?.nalfa?.ko === true;

export const getHealthStateSnapshot = (actor) => ({
	hp: Number(actor?.system?.attributes?.hp?.value ?? 0),
});

export const syncActorHealthState = async (
	actor,
	{ previous = null, options = {}, userId = null } = {},
) => {
	if (!(actor instanceof Actor)) return;
	if (userId && userId !== game.user?.id) return;
	if (options.nalfaHealthSync) return;

	const hp = actor.system.attributes?.hp ?? {};
	const value = Number(hp.value ?? 0);
	const max = Math.max(1, Number(hp.max ?? 1));
	const isKo = value <= 0;
	const isDead = value < -max;
	const koEffects = getActorStateEffects(actor).filter(isHealthKoEffect);
	if (isKo && !koEffects.length) {
		const effect = buildNalfaStateEffect({ stateId: "inconscience" });
		effect.flags.nalfa.ko = true;
		await actor.createEmbeddedDocuments("ActiveEffect", [effect]);
	} else if (!isKo && koEffects.length) {
		await actor.deleteEmbeddedDocuments(
			"ActiveEffect",
			koEffects.map((effect) => effect.id),
		);
	}

	const hasDeathStatus = actor.statuses?.has(KO_DEATH_STATUS_ID) ?? false;
	if (hasDeathStatus !== isDead) {
		await actor.toggleStatusEffect(KO_DEATH_STATUS_ID, { active: isDead, overlay: isDead });
	}

	if (
		actor.type === "Character" &&
		Number(previous?.hp) <= 0 &&
		value > 0
	) {
		const fatigue = getFatigueEffects(actor.system.attributes?.exhaustion).level;
		await actor.update(
			{ "system.attributes.exhaustion": normalizeFatigue(fatigue + 1) },
			{ nalfaHealthSync: true },
		);
	}
};

export const applyKoTurnDamage = async (actor) => {
	if (!(actor instanceof Actor)) return false;
	const hp = actor.system.attributes?.hp ?? {};
	const value = Number(hp.value ?? 0);
	const max = Math.max(1, Number(hp.max ?? 1));
	if (value > 0 || value < -max) return false;

	const loss = Math.max(1, Math.floor(max * 0.1));
	await actor.update({ "system.attributes.hp.value": value - loss });
	return true;
};
