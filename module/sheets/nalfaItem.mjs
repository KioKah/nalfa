export default class NalfaItem extends Item {
	/** Define your chat‐template paths the same way */
	chatTemplate = {
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

		chatData.content = await renderTemplate(this.chatTemplate[this.type], cardData);
		chatData.roll = true; // your “hack” to mark it as a roll card

		return ChatMessage.create(chatData);
	}
}
