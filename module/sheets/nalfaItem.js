export default class NalfaItem extends Item {
	chatTemplate = {
		weapon: "systems/nalfa/templates/chat/roll/weapon.hbs",
	};

	async roll() {
		let chatData = {
			user: game.user._id,
			speaker: ChatMessage.getSpeaker(),
		};

		// NOTE nom de la var non adapté
		let cardData = {
			...this.data,
			owner: this.actor.id,
		};

		chatData.content = await renderTemplate(this.chatTemplate[this.type], cardData);
		chatData.roll = true; // hack :) Part 5 2:58

		return ChatMessage.create(chatData);
	}
}
