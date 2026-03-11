import { TypeDataModel } from "../base.mjs";
import { prepareActorDerivedData } from "./derived.mjs";
import { baseActorSchema, characterActorSchema, npcActorSchema } from "./schema.mjs";

export class BaseActorData extends TypeDataModel {
	prepareBaseData() {
		super.prepareBaseData();
		this.ui ??= {};
		this.ui.valueMode ??= "values";
	}

	prepareDerivedData() {
		super.prepareDerivedData();
		prepareActorDerivedData(this);
	}

	static defineSchema() {
		return baseActorSchema();
	}
}

export class CharacterData extends BaseActorData {
	static defineSchema() {
		return characterActorSchema();
	}
}

export class NPCData extends BaseActorData {
	static defineSchema() {
		return npcActorSchema();
	}
}
