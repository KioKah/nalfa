import { rollInitiative as rollNalfaInitiative } from "../rolls/rolls.mjs";

export default class NalfaCombat extends Combat {
	async rollInitiative(ids, options = {}) {
		const combatantIds = Array.isArray(ids) ? ids : [ids];
		const { formula = null, messageOptions = {}, updateTurn = true } = options;

		if (formula) {
			return super.rollInitiative(ids, options);
		}

		const currentId = this.combatant?.id ?? null;
		const initiativeUpdates = [];

		for (const combatantId of combatantIds) {
			const combatant = this.combatants.get(combatantId);
			if (!combatant) continue;

			const actor = combatant.actor;
			if (!actor) continue;

			const combatantMessageOptions = { ...messageOptions };
			if (combatant.hidden && !combatantMessageOptions.whisper) {
				combatantMessageOptions.whisper = ChatMessage.getWhisperRecipients("GM").map(
					(user) => user.id,
				);
			}

			const rollData = await rollNalfaInitiative(actor, {
				titleName: combatant.name ?? "",
				messageOptions: combatantMessageOptions,
			});
			const initiativeValue = Number(rollData?.roll?.total);
			if (!Number.isFinite(initiativeValue)) continue;

			initiativeUpdates.push({
				_id: combatant.id,
				initiative: initiativeValue,
			});
		}

		if (!initiativeUpdates.length) return this;

		await this.updateEmbeddedDocuments("Combatant", initiativeUpdates);

		if (updateTurn !== false && currentId) {
			const turn = this.turns.findIndex((combatant) => combatant.id === currentId);
			if (turn >= 0 && turn !== this.turn) {
				await this.update({ turn });
			}
		}

		return this;
	}
}
