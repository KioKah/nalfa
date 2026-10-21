import { rollSaveTarget } from "../rolls/workflows/save.mjs";
import { applyKoTurnDamage } from "./health.mjs";
import { getActorStateEffects } from "./states.mjs";

const getTurnSave = (effect) => effect.flags?.nalfa?.state?.behavior?.turnSave ?? null;

export const processActorTurnStart = async (actor) => {
	if (!(actor instanceof Actor)) return;
	await applyKoTurnDamage(actor);

	const effects = getActorStateEffects(actor).filter((effect) => getTurnSave(effect));
	for (const effect of effects) {
		if (effect.flags?.nalfa?.state?.turnBlocked === true) {
			await effect.update({ "flags.nalfa.state.turnBlocked": false });
		}
	}
	for (const effect of effects) {
		const turnSave = getTurnSave(effect);
		const result = await rollSaveTarget(
			actor,
			turnSave.stat,
			turnSave.dc,
			effect.name,
			{ titleLabel: "Sauv de début de tour" },
		);
		if (result?.isSuccess) {
			if (turnSave.removeOnSuccess) await effect.delete();
			continue;
		}
		if (turnSave.blocksOnFailure) {
			await effect.update({ "flags.nalfa.state.turnBlocked": true });
		}
	}
};
