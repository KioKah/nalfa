const DEFAULT_ITEM_ICON = "icons/svg/item-bag.svg";

export const htmlToPlainText = (value, { preserveLineBreaks = false } = {}) => {
	const html = String(value ?? "");
	if (!html) return "";

	const container = document.createElement("div");
	container.innerHTML = html;

	if (!preserveLineBreaks) {
		return String(container.textContent ?? "")
			.replace(/\s+/g, " ")
			.trim();
	}

	for (const element of container.querySelectorAll("br")) {
		element.replaceWith(document.createTextNode("\n"));
	}

	for (const element of container.querySelectorAll("p, div, li")) {
		if (element.lastChild?.nodeType !== Node.TEXT_NODE) {
			element.append(document.createTextNode("\n"));
			continue;
		}

		const text = element.lastChild.textContent ?? "";
		if (!text.endsWith("\n")) {
			element.lastChild.textContent = `${text}\n`;
		}
	}

	return String(container.textContent ?? "")
		.replace(/\r/g, "")
		.replace(/[ \t\f\v]+/g, " ")
		.replace(/[ \t\f\v]*\n[ \t\f\v]*/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
};

export const getItemImage = (item) => {
	const defaultItemIcon = item.constructor?.DEFAULT_ICON ?? DEFAULT_ITEM_ICON;
	const defaultArtwork = item.constructor?.getDefaultArtwork?.(item.toObject()) ?? {};
	return item.img === defaultItemIcon ? (defaultArtwork.img ?? item.img) : item.img;
};

export const toFiniteNumber = (value, fallback = 0) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

export const formatSignedNumber = (value) => {
	const number = toFiniteNumber(value, 0);
	return number >= 0 ? `+${number}` : `${number}`;
};

export const getActorStatValue = (item, statKey) => {
	if (!statKey || statKey === "none") return 0;

	const actor = item.actor ?? item.parent ?? null;
	const actorSystem = actor?.system ?? {};
	const rollStatValue = actorSystem?.roll_stats?.[statKey]?.value;
	if (Number.isFinite(Number(rollStatValue))) return Number(rollStatValue);

	const statValue = actorSystem?.stats?.[statKey]?.value;
	if (Number.isFinite(Number(statValue))) return Number(statValue);

	return 0;
};
