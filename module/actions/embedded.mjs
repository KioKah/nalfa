import { createDefaultActionData } from "./core.mjs";

export const MAX_EMBEDDED_ACTIONS = 3;

export const EMBEDDED_ACTION_SOURCE_EMPTY = Object.freeze({
	source_uuid: "",
	source_version: "",
	source_hash: "",
	always_refresh: false,
});

export const createDefaultEmbeddedAction = ({ name = "", shorthand = "" } = {}) => ({
	name,
	shorthand,
	...createDefaultActionData(),
	...EMBEDDED_ACTION_SOURCE_EMPTY,
});

export const getDefaultEmbeddedActionName = (itemName, index) => {
	const baseName = String(itemName ?? "").trim();
	const fallbackName = "Action";
	const resolvedBaseName = baseName || fallbackName;

	if (index <= 0) return resolvedBaseName;
	return `${resolvedBaseName} ${index + 1}`;
};

export const getDefaultEmbeddedActionShorthand = (index) => String(index + 1);

const toSourceVersion = (sourceItem) => {
	const modifiedTime = Number(sourceItem?._stats?.modifiedTime ?? 0);
	if (!Number.isFinite(modifiedTime) || modifiedTime <= 0) return "";
	return String(modifiedTime);
};

const hashString = (value = "") => {
	let hash = 0;
	for (const char of String(value)) {
		hash = (hash << 5) - hash + char.charCodeAt(0);
		hash |= 0;
	}
	return (hash >>> 0).toString(16);
};

const createActionPayloadForHash = ({ name = "", shorthand = "", actionData = {} } = {}) => {
	const defaultActionData = createDefaultActionData();
	const payload = {
		name: String(name ?? ""),
		shorthand: String(shorthand ?? ""),
	};

	for (const key of Object.keys(defaultActionData)) {
		payload[key] = foundry.utils.deepClone(actionData?.[key] ?? defaultActionData[key]);
	}

	return payload;
};

export const computeEmbeddedActionSourceHash = ({
	name = "",
	shorthand = "",
	actionData = {},
} = {}) => {
	const payload = createActionPayloadForHash({ name, shorthand, actionData });
	return hashString(JSON.stringify(payload));
};

export const hasEmbeddedActionSource = (embeddedAction = {}) => {
	const sourceUuid = String(embeddedAction?.source_uuid ?? "").trim();
	return sourceUuid.length > 0;
};

export const clearEmbeddedActionSource = (embeddedAction = {}) => {
	const clone = foundry.utils.deepClone(embeddedAction ?? {});
	return {
		...clone,
		...EMBEDDED_ACTION_SOURCE_EMPTY,
	};
};

export const createEmbeddedActionFromSourceItem = (
	sourceItem,
	{ alwaysRefresh = false } = {},
) => {
	if (!sourceItem || sourceItem.type !== "Action") {
		const fallback = createDefaultEmbeddedAction();
		fallback.always_refresh = Boolean(alwaysRefresh);
		return fallback;
	}

	const sourceSystem = foundry.utils.deepClone(sourceItem.system ?? {});
	const name = String(sourceItem.name ?? "").trim();
	const shorthand = String(sourceSystem?.shorthand ?? "").trim();
	const snapshot = createDefaultEmbeddedAction({ name, shorthand });
	const defaultActionData = createDefaultActionData();

	for (const key of Object.keys(defaultActionData)) {
		snapshot[key] = foundry.utils.deepClone(sourceSystem?.[key] ?? snapshot[key]);
	}

	snapshot.source_uuid = String(sourceItem.uuid ?? "").trim();
	snapshot.source_version = toSourceVersion(sourceItem);
	snapshot.source_hash = computeEmbeddedActionSourceHash({
		name: snapshot.name,
		shorthand: snapshot.shorthand,
		actionData: snapshot,
	});
	snapshot.always_refresh = Boolean(alwaysRefresh);

	return snapshot;
};

export const isEmbeddedActionSourceChanged = (embeddedAction = {}, sourceItem) => {
	if (!sourceItem || sourceItem.type !== "Action") return false;

	const alwaysRefresh = embeddedAction?.always_refresh === true;
	const sourceSnapshot = createEmbeddedActionFromSourceItem(sourceItem, {
		alwaysRefresh,
	});
	const sourceVersion = String(sourceSnapshot.source_version ?? "");
	const sourceHash = String(sourceSnapshot.source_hash ?? "");

	return (
		sourceVersion !== String(embeddedAction?.source_version ?? "") ||
		sourceHash !== String(embeddedAction?.source_hash ?? "")
	);
};
