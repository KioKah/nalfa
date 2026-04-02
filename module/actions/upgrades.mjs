const getTrimmedString = (value) => {
	return String(value ?? "").trim();
};

const toNonNegativeInteger = (value, fallback = 0) => {
	const number = Number(value);
	if (!Number.isInteger(number) || number < 0) return fallback;
	return number;
};

const toNullableNonNegativeInteger = (value) => {
	if (value === null || value === undefined || value === "") return null;
	const number = Number(value);
	if (!Number.isInteger(number) || number < 0) return null;
	return number;
};

const getUpgradeMarkerMatch = (name = "") => {
	return getTrimmedString(name).match(/\s*(\*{1,2})$/u);
};

export const stripActionUpgradeMarker = (name = "") => {
	const trimmedName = getTrimmedString(name);
	const markerMatch = getUpgradeMarkerMatch(trimmedName);
	if (!markerMatch) return trimmedName;
	return trimmedName
		.slice(0, trimmedName.length - markerMatch[0].length)
		.trimEnd();
};

export const getActionUpgradeRankFromName = (name = "") => {
	const markerMatch = getUpgradeMarkerMatch(name);
	return markerMatch ? markerMatch[1].length : 0;
};

export const getActionSyncMetadata = (itemLike = {}) => {
	const name = getTrimmedString(itemLike?.name);
	const syncData = itemLike?.system?.sync ?? itemLike?.sync ?? {};
	const id = getTrimmedString(syncData.id);
	const classKey = getTrimmedString(syncData.class_key);
	const level = toNullableNonNegativeInteger(syncData.level);
	const slot = toNullableNonNegativeInteger(syncData.slot);
	const lineage = getTrimmedString(syncData.lineage);
	const upgradedFromName = getActionUpgradeRankFromName(name);
	const upgraded = toNonNegativeInteger(syncData.upgraded, upgradedFromName);
	const legacyLineageKey = classKey ? `${classKey}:${level ?? "none"}:${slot ?? "none"}` : "";
	const lineageKey = lineage || legacyLineageKey;

	return {
		name,
		baseName: stripActionUpgradeMarker(name),
		id,
		classKey,
		level,
		slot,
		lineage,
		upgraded,
		lineageKey,
		isTracked: Boolean(id || lineageKey),
	};
};

const getTrackedOwnedActionEntries = (actor, lineageKey) => {
	if (!(actor instanceof Actor) || !lineageKey) return [];

	return actor.items
		.filter((item) => item?.type === "Action")
		.map((item) => ({ item, sync: getActionSyncMetadata(item) }))
		.filter((entry) => entry.sync.isTracked && entry.sync.lineageKey === lineageKey);
};

const buildOwnedActionReplacement = (incomingItem) => {
	const source = incomingItem.toObject();
	return {
		name: source.name,
		img: source.img,
		system: foundry.utils.deepClone(source.system ?? {}),
	};
};

const notifyInfo = (message) => {
	ui.notifications?.info?.(message);
};

const notifyWarning = (message) => {
	ui.notifications?.warn?.(message);
};

const chooseOwnedActionToRefresh = (entries, incomingSync) => {
	const exactMatch = entries.find((entry) => {
		if (incomingSync.id && entry.sync.id) {
			return entry.sync.id === incomingSync.id;
		}

		return entry.sync.upgraded === incomingSync.upgraded;
	});
	if (exactMatch) {
		return { mode: "refresh", entry: exactMatch };
	}

	const lowerRankEntries = entries
		.filter((entry) => entry.sync.upgraded < incomingSync.upgraded)
		.sort((left, right) => right.sync.upgraded - left.sync.upgraded);
	if (lowerRankEntries.length > 0) {
		return { mode: "upgrade", entry: lowerRankEntries[0] };
	}

	const higherRankEntry = entries
		.filter((entry) => entry.sync.upgraded > incomingSync.upgraded)
		.sort((left, right) => left.sync.upgraded - right.sync.upgraded)[0];
	if (higherRankEntry) {
		return { mode: "downgrade-blocked", entry: higherRankEntry };
	}

	return { mode: "create", entry: null };
};

export const maybeHandleActionUpgradePreCreate = async (itemDocument) => {
	if (!(itemDocument instanceof Item) || itemDocument.type !== "Action") return true;
	if (!(itemDocument.parent instanceof Actor)) return true;

	const incomingSync = getActionSyncMetadata(itemDocument);
	if (!incomingSync.isTracked) return true;

	const matchingOwnedEntries = getTrackedOwnedActionEntries(
		itemDocument.parent,
		incomingSync.lineageKey,
	);
	const actorName = getTrimmedString(itemDocument.parent.name) || "cet acteur";
	const actionName = incomingSync.baseName || incomingSync.name || "cette action";
	const selectedMatch = chooseOwnedActionToRefresh(
		matchingOwnedEntries,
		incomingSync,
	);

	if (selectedMatch.mode === "refresh" && selectedMatch.entry) {
		await selectedMatch.entry.item.update(buildOwnedActionReplacement(itemDocument));
		return false;
	}

	if (selectedMatch.mode === "upgrade" && selectedMatch.entry) {
		await selectedMatch.entry.item.update(buildOwnedActionReplacement(itemDocument));
		const replacedActionName =
			getTrimmedString(selectedMatch.entry.item.name) || actionName;
		const incomingActionName = incomingSync.name || actionName;
		notifyInfo(
			`"${incomingActionName}" remplace "${replacedActionName}" sur ${actorName}.`,
		);
		return false;
	}

	if (selectedMatch.mode === "downgrade-blocked" && selectedMatch.entry) {
		notifyWarning(
			`${actorName} possede deja une version plus avancee de "${actionName}".`,
		);
		return false;
	}

	if (incomingSync.upgraded > 0) {
		const incomingActionName = incomingSync.name || actionName;
		notifyWarning(
			`${actorName} recoit "${incomingActionName}" sans version precedente correspondante.`,
		);
	}

	return true;
};
