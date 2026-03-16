import { ACTION_REF_TYPES, HOTBAR_DROP_TYPE_EMBEDDED_ACTION } from "../../actions/refs.mjs";
import {
	formatEmbeddedActionShorthand,
	resolveEmbeddedActionShorthand,
} from "../../actions/embedded.mjs";

const DEFAULT_ACTION_MACRO_IMG = "icons/svg/dice-target.svg";
const MACRO_FLAG_SCOPE = "nalfa";
const ACTION_MACRO_FLAG = "actionMacro";
const ACTION_MACRO_NAME_PREFIX = "Action : ";
const HOTBAR_ACTION_CLASS = "nalfa-hotbar-action";
const HOTBAR_ACTION_SHORTHAND_CLASS = "nalfa-hotbar__shorthand";

const buildActionMacroCommand = (actionRef) => {
	return `game.nalfa.macros.runActionRef(${JSON.stringify(actionRef)});`;
};

const getTrimmedString = (value) => {
	return String(value ?? "").trim();
};

const dedupeStrings = (values = []) => {
	return [...new Set(values.map(getTrimmedString).filter(Boolean))];
};

const buildActionMacroAliases = ({ actionName = "", actionShorthand = "" } = {}) => {
	const labels = dedupeStrings([actionShorthand, actionName]);
	return dedupeStrings([
		...labels,
		...labels.map((label) => `Action: ${label}`),
		...labels.map((label) => `${ACTION_MACRO_NAME_PREFIX}${label}`),
	]);
};

const buildActionMacroFlags = ({ actionName = "", actionShorthand = "" } = {}) => {
	return {
		[MACRO_FLAG_SCOPE]: {
			[ACTION_MACRO_FLAG]: true,
			actionName: getTrimmedString(actionName),
			actionShorthand: getTrimmedString(actionShorthand),
		},
	};
};

const isManagedActionMacro = (macro) => {
	return macro?.getFlag?.(MACRO_FLAG_SCOPE, ACTION_MACRO_FLAG) === true;
};

const getActionMacroMetadata = (macro) => {
	if (!isManagedActionMacro(macro)) return null;

	const actionName = getTrimmedString(macro.getFlag(MACRO_FLAG_SCOPE, "actionName"));
	const actionShorthand = getTrimmedString(
		macro.getFlag(MACRO_FLAG_SCOPE, "actionShorthand"),
	);
	const displayShorthand = actionShorthand || actionName || getTrimmedString(macro.name);
	if (!displayShorthand) return null;

	return {
		actionName,
		actionShorthand,
		displayShorthand,
	};
};

const createOrAssignMacro = async ({
	slot,
	name,
	command,
	img,
	legacyNames = [],
	flags = {},
}) => {
	const aliasNames = dedupeStrings([name, ...legacyNames]);
	let macro = game.macros.find((entry) => {
		if (entry.command !== command) return false;
		return isManagedActionMacro(entry) || aliasNames.includes(entry.name);
	});

	if (!macro) {
		macro = await Macro.create({
			name,
			type: "script",
			img: img || DEFAULT_ACTION_MACRO_IMG,
			command,
			flags,
		});
	} else {
		const updates = {};
		if (macro.name !== name) updates.name = name;
		if (img && macro.img !== img) updates.img = img;

		for (const [scope, scopeFlags] of Object.entries(flags)) {
			for (const [key, value] of Object.entries(scopeFlags ?? {})) {
				if (macro.getFlag(scope, key) === value) continue;
				updates[`flags.${scope}.${key}`] = value;
			}
		}

		if (Object.keys(updates).length > 0) {
			await macro.update(updates);
		}
	}

	await game.user.assignHotbarMacro(macro, Number(slot));
	return macro;
};

const getDocumentImage = (document) => {
	return getTrimmedString(document?.img);
};

const resolveEmbeddedActionMacroImage = async ({ sourceUuid = "", img = "" } = {}) => {
	const resolvedSourceUuid = getTrimmedString(sourceUuid);
	if (resolvedSourceUuid) {
		const sourceItem = await fromUuid(resolvedSourceUuid);
		const sourceImage = getDocumentImage(sourceItem);
		if (sourceImage) return sourceImage;
	}

	return getTrimmedString(img) || DEFAULT_ACTION_MACRO_IMG;
};

const getMacroDisplayName = (actionName = "") => {
	return `${ACTION_MACRO_NAME_PREFIX}${getTrimmedString(actionName) || "Action"}`;
};

const getHotbarRootElement = (hotbar, html) => {
	const candidates = [html, html?.[0], hotbar?.element, hotbar?.element?.[0]];

	for (const candidate of candidates) {
		if (candidate instanceof Element) return candidate;
	}

	return null;
};

const getRenderedMacroLookup = (hotbar) => {
	const lookup = new Map();
	const renderedMacros = game.user?.getHotbarMacros?.(hotbar?.page);
	if (Array.isArray(renderedMacros)) {
		for (const entry of renderedMacros) {
			const slot = Number(entry?.slot ?? -1);
			if (!Number.isInteger(slot) || slot < 1) continue;
			if (!entry?.macro) continue;
			lookup.set(slot, entry.macro);
		}
	}

	return lookup;
};

const getHotbarMacroForSlot = (slotElement, macroLookup) => {
	const slot = Number(slotElement?.dataset?.slot ?? -1);
	if (!Number.isInteger(slot) || slot < 1) return null;

	const renderedMacro = macroLookup.get(slot);
	if (renderedMacro) return renderedMacro;

	const macroId = getTrimmedString(slotElement?.dataset?.macroId);
	if (macroId) return game.macros?.get?.(macroId) ?? null;

	const userHotbarEntry = game.user?.hotbar?.[slot];
	const fallbackMacroId =
		typeof userHotbarEntry === "string"
			? userHotbarEntry
			: getTrimmedString(userHotbarEntry?.macro);
	if (!fallbackMacroId) return null;

	return game.macros?.get?.(fallbackMacroId) ?? null;
};

export const renderHotbarActionShorthand = (hotbar, html) => {
	const root = getHotbarRootElement(hotbar, html);
	if (!root) return;

	root.querySelectorAll(`.${HOTBAR_ACTION_SHORTHAND_CLASS}`).forEach((element) => {
		element.remove();
	});
	root.querySelectorAll(`.${HOTBAR_ACTION_CLASS}`).forEach((element) => {
		element.classList.remove(HOTBAR_ACTION_CLASS);
	});

	const macroLookup = getRenderedMacroLookup(hotbar);
	root.querySelectorAll(".slot[data-slot]").forEach((slotElement) => {
		const macro = getHotbarMacroForSlot(slotElement, macroLookup);
		const metadata = getActionMacroMetadata(macro);
		if (!metadata) return;

		const shorthandElement = document.createElement("span");
		shorthandElement.className = HOTBAR_ACTION_SHORTHAND_CLASS;
		shorthandElement.innerHTML = foundry.utils
			.escapeHTML(formatEmbeddedActionShorthand(metadata.displayShorthand))
			.replace(/\n/g, "<br>");

		slotElement.classList.add(HOTBAR_ACTION_CLASS);
		slotElement.append(shorthandElement);
	});
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
	const actionShorthand = String(normalized.actionShorthand ?? "").trim();
	const sourceUuid = String(normalized.sourceUuid ?? "").trim();
	const img = String(normalized.img ?? "").trim();

	if (!itemUuid || !Number.isInteger(actionIndex) || actionIndex < 0) return null;

	return {
		actionRef: {
			refType: ACTION_REF_TYPES.EMBEDDED_ACTION,
			itemUuid,
			actionIndex,
			actorUuid,
		},
		actionName,
		actionShorthand,
		sourceUuid,
		img,
	};
};

export const createHotbarMacro = async (dropData, slot) => {
	const normalizedDropData = normalizeDropData(dropData);
	const embeddedActionDrop = parseEmbeddedActionDropRef(normalizedDropData);
	if (embeddedActionDrop) {
		const actionName =
			embeddedActionDrop.actionName ||
			`Action ${Number(embeddedActionDrop.actionRef.actionIndex) + 1}`;
		const macroName = getMacroDisplayName(actionName);
		const command = buildActionMacroCommand(embeddedActionDrop.actionRef);
		const img = await resolveEmbeddedActionMacroImage(embeddedActionDrop);
		await createOrAssignMacro({
			slot,
			name: macroName,
			command,
			img,
			legacyNames: buildActionMacroAliases({
				actionName,
				actionShorthand: embeddedActionDrop.actionShorthand,
			}),
			flags: buildActionMacroFlags({
				actionName,
				actionShorthand: embeddedActionDrop.actionShorthand,
			}),
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
	const actionName = getTrimmedString(actionItem.name) || "Action";
	const actionShorthand = resolveEmbeddedActionShorthand({
		shorthand: actionItem.system?.shorthand,
		actionName,
	});
	await createOrAssignMacro({
		slot,
		name: getMacroDisplayName(actionName),
		command,
		img: actionItem.img,
		legacyNames: buildActionMacroAliases({ actionName, actionShorthand }),
		flags: buildActionMacroFlags({ actionName, actionShorthand }),
	});

	return false;
};
