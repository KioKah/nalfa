const getDescriptionValue = (item) => {
	const descriptionData = item.system?.description ?? {};
	return typeof descriptionData === "string" ? descriptionData : (descriptionData.value ?? "");
};

export const getBaseItemNameForIdentification = (name) => {
	return String(name ?? "")
		.replace(/\s\((?:!|\?|-)\)$/, "")
		.trim();
};

export const toUnknownDescription = (description) => {
	const text = String(description ?? "");
	if (text.startsWith("(?) ")) return text;
	return text.length ? `(?) ${text}` : "(?)";
};

export const toNeutralName = (name) => {
	return String(name ?? "").replace(/\s\((?:!|\?)\)$/, " (-)");
};

export const buildNeedsIdentificationUpdate = (item, isEnabled) => {
	if (!isEnabled) {
		return {
			name: toNeutralName(item.name),
			"system.identification.needs_identification": false,
			"system.identification.identified": false,
		};
	}

	const baseName = getBaseItemNameForIdentification(item.name);
	const baseDescription = getDescriptionValue(item);
	const unknownDescription = toUnknownDescription(baseDescription);
	const trueName = `${baseName} (!)`.trim();
	const unknownName = `${baseName} (?)`.trim();

	return {
		name: unknownName,
		"system.identification.needs_identification": true,
		"system.identification.true_name": trueName,
		"system.identification.unidentified.name": unknownName,
		"system.identification.unidentified.description": unknownDescription,
		"system.identification.identified": false,
	};
};

export const buildIdentifiedUpdate = (item, isIdentified) => {
	const trueName = String(item.system?.identification?.true_name ?? "").trim();
	const unknownName = String(item.system?.identification?.unidentified?.name ?? "").trim();
	const name = isIdentified ? trueName || item.name : unknownName || item.name;

	return {
		name,
		"system.identification.needs_identification": true,
		"system.identification.identified": isIdentified,
	};
};
