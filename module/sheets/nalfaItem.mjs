import { maybeHandleActionUpgradePreCreate } from "../actions/upgrades.mjs";

const clearEquippedState = (item, sourceData = {}) => {
	if (!(item.parent instanceof Actor)) return;

	const equippedState = sourceData?.system?.equipped;
	if (!equippedState || !Object.values(equippedState).some(Boolean)) return;

	item.updateSource({
		"system.equipped": Object.fromEntries(
			Object.keys(equippedState).map((key) => [key, false]),
		),
	});
};

export default class NalfaItem extends Item {
	static TYPE_ICON_MAP = Object.freeze({
		Action: "Spell",
	});

	static AVAILABLE_TYPE_ICONS = new Set([
		"Backpack",
		"Book",
		"Class",
		"CombatStyle",
		"Consumable",
		"Currency",
		"Job",
		"Loot",
		"Race",
		"Spell",
		"Status",
		"Tool",
		"Trinket",
		"Weapon",
		"WeaponAttribute",
	]);

	static getDefaultArtwork(itemData = {}) {
		const iconName = this.TYPE_ICON_MAP[itemData.type] ?? itemData.type;
		if (iconName && this.AVAILABLE_TYPE_ICONS.has(iconName)) {
			return {
				img: `systems/nalfa/icons/base_icons/${iconName}.svg`,
			};
		}
		return super.getDefaultArtwork(itemData);
	}

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

	async _preCreate(data, options, user) {
		const allowed = await super._preCreate(data, options, user);
		if (allowed === false) return false;
		clearEquippedState(this, data);
		return maybeHandleActionUpgradePreCreate(this);
	}
}
