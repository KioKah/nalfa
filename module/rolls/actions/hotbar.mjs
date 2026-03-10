import { ACTION_REF_TYPES, HOTBAR_DROP_TYPE_EMBEDDED_ACTION } from "../../actions/refs.mjs";

const buildActionMacroCommand = (actionRef) => {
	return `game.nalfa.macros.runActionRef(${JSON.stringify(actionRef)});`;
};

const createOrAssignMacro = async ({ slot, name, command, img }) => {
	let macro = game.macros.find((entry) => entry.name === name && entry.command === command);

	if (!macro) {
		macro = await Macro.create({
			name,
			type: "script",
			img: img || "icons/svg/dice-target.svg",
			command,
		});
	}

	await game.user.assignHotbarMacro(macro, Number(slot));
	return macro;
};

const getActionItemFromDropData = async (dropData) => {
	if (dropData?.type !== "Item") return null;

	const item = await Item.implementation.fromDropData(dropData);
	if (!(item instanceof Item) || item.type !== "Action") return null;
	return item;
};

const parseJsonLike = (value) => {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;

	try {
		const parsed = JSON.parse(trimmed);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch {
		return null;
	}
};

const normalizeDropData = (dropData) => {
	if (!dropData) return {};
	if (typeof dropData === "string") return parseJsonLike(dropData) ?? {};

	const objectData =
		typeof dropData === "object" && dropData !== null ? foundry.utils.deepClone(dropData) : {};

	if (objectData.type || objectData.refType) return objectData;

	const candidates = [objectData.data, objectData.payload, objectData.text, objectData.value];
	for (const candidate of candidates) {
		const parsed = parseJsonLike(candidate);
		if (parsed) return parsed;
	}

	return objectData;
};

const parseEmbeddedActionDropRef = (dropData) => {
	const normalized = normalizeDropData(dropData);
	if (normalized?.type !== HOTBAR_DROP_TYPE_EMBEDDED_ACTION) return null;

	const itemUuid = String(normalized.itemUuid ?? "").trim();
	const actionIndex = Number(normalized.actionIndex ?? -1);
	const actorUuid = String(normalized.actorUuid ?? "").trim();
	const actionName = String(normalized.actionName ?? "").trim();

	if (!itemUuid || !Number.isInteger(actionIndex) || actionIndex < 0) return null;

	return {
		actionRef: {
			refType: ACTION_REF_TYPES.EMBEDDED_ACTION,
			itemUuid,
			actionIndex,
			actorUuid,
		},
		actionName,
	};
};

export const createHotbarMacro = async (dropData, slot) => {
	const normalizedDropData = normalizeDropData(dropData);
	const embeddedActionDrop = parseEmbeddedActionDropRef(normalizedDropData);
	if (embeddedActionDrop) {
		const macroName =
			embeddedActionDrop.actionName ||
			`Action ${Number(embeddedActionDrop.actionRef.actionIndex) + 1}`;
		const command = buildActionMacroCommand(embeddedActionDrop.actionRef);
		await createOrAssignMacro({
			slot,
			name: `Action: ${macroName}`,
			command,
		});
		return false;
	}

	const actionItem = await getActionItemFromDropData(normalizedDropData);
	if (!actionItem) return true;

	const actorUuid = actionItem.parent instanceof Actor ? actionItem.parent.uuid : "";
	const actionRef = {
		refType: ACTION_REF_TYPES.ACTION_ITEM,
		itemUuid: actionItem.uuid,
		actorUuid,
	};
	const command = buildActionMacroCommand(actionRef);
	await createOrAssignMacro({
		slot,
		name: `Action: ${actionItem.name}`,
		command,
		img: actionItem.img,
	});

	return false;
};
