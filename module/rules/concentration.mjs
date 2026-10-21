import { stopConcentration } from "../actions/turnResources.mjs";
import { rollConcentrationFromAction } from "../rolls/workflows/concentration.mjs";

export const getConcentrationDamageSnapshot = (actor) => ({
	hp: Number(actor.system?.attributes?.hp?.value ?? 0),
	temporaryHp: Number(actor.system?.attributes?.hp?.abso ?? 0),
});

export const checkConcentrationAfterDamage = async (actor, previous = {}) => {
	const active = actor.system?.actions?.concentration?.active ?? {};
	if (!String(active.name ?? "").trim()) return;

	const current = getConcentrationDamageSnapshot(actor);
	if (!(current.hp < Number(previous.hp) || current.temporaryHp < Number(previous.temporaryHp))) {
		return;
	}

	const result = await rollConcentrationFromAction(
		actor,
		{ concentration: active, name: active.name },
		{ titleName: active.name },
	);
	if (result?.isSuccess === false) await stopConcentration(actor);
};
