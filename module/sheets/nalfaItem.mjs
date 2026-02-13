export default class NalfaItem extends Item {
	/** Define your chat‐template paths the same way */
	chatTemplate = {
		Weapon: "systems/nalfa/templates/chat/roll/weapon.hbs",
		weapon: "systems/nalfa/templates/chat/roll/weapon.hbs",
	};

	/**
	 * Roll the item into chat.
	 * Use this.toObject() instead of this.data, and extend `Item`, not `foundry.documents.Item`.
	 */
	async roll() {
		const chatData = {
			user: game.user.id,
			speaker: ChatMessage.getSpeaker(),
		};

		// Replace `this.data` with `this.toObject()` so you get a fresh snapshot
		const cardData = {
			...this.toObject(),
			owner: this.actor?.id,
		};

		const templatePath = this.chatTemplate[this.type];
		if (!templatePath) {
			ui.notifications?.warn(`Aucun template de chat pour le type ${this.type}.`);
			return null;
		}

		chatData.content = await renderTemplate(templatePath, cardData);
		chatData.roll = true; // your “hack” to mark it as a roll card

		return ChatMessage.create(chatData);
	}
}
