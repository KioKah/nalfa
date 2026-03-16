import { createDefaultActionData } from "./core.mjs";

export const MAX_EMBEDDED_ACTIONS = 3;
const SHORTHAND_LINE_BUDGET = 7;
const SHORTHAND_MAX_WORDS = 3;
const SHORTHAND_FILLER_WORDS = new Set([
	"a",
	"an",
	"and",
	"au",
	"aux",
	"d",
	"de",
	"des",
	"du",
	"et",
	"l",
	"la",
	"le",
	"les",
	"of",
	"the",
]);

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

const tokenizeShorthandWords = (value) => {
	const baseWords = String(value ?? "")
		.replace(/’/g, "'")
		.trim()
		.split(/\s+/)
		.map((word) => word.trim())
		.filter(Boolean);

	return baseWords.flatMap((word) => {
		const match = word.match(/^([cdjlmnst])'(.+)$/iu);
		if (!match) return [word];

		const [, article, rest] = match;
		return [`${article}'`, rest];
	});
};

const normalizeWordForWeight = (word) => {
	const normalized = String(word ?? "")
		.toLowerCase()
		.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

	return normalized.replace(/^[cdjlmnst]'(?=\p{L})/u, "");
};

const getWordWeight = (word) => {
	const normalized = normalizeWordForWeight(word);
	if (!normalized) return 0;

	let weight = Math.min(normalized.length, 12);
	if (/\d/.test(word)) weight += 2;
	if (/[A-ZÀ-ÖØ-Þ]/.test(word)) weight += 1;
	if (SHORTHAND_FILLER_WORDS.has(normalized)) weight -= 6;
	return weight;
};

const isFillerWord = (word) => {
	const normalized = normalizeWordForWeight(word);
	return normalized ? SHORTHAND_FILLER_WORDS.has(normalized) : false;
};

const chooseBestShorthandSplit = (text) => {
	const words = tokenizeShorthandWords(text);
	if (words.length <= 1) {
		return {
			formatted: text,
			visibleTotal: Math.min(SHORTHAND_LINE_BUDGET, text.length),
			visibleBottom: 0,
			clippedCount: Math.max(0, text.length - SHORTHAND_LINE_BUDGET),
		};
	}

	let bestCandidate = {
		formatted: text,
		visibleTotal: Math.min(SHORTHAND_LINE_BUDGET, text.length),
		visibleBottom: 0,
		clippedCount: Math.max(0, text.length - SHORTHAND_LINE_BUDGET),
	};

	for (let index = 1; index < words.length; index += 1) {
		const topLine = words.slice(0, index).join(" ");
		const bottomLine = words.slice(index).join(" ");
		const visibleTop = Math.min(SHORTHAND_LINE_BUDGET, topLine.length);
		const visibleBottom = Math.min(SHORTHAND_LINE_BUDGET, bottomLine.length);
		const visibleTotal = visibleTop + visibleBottom;
		const clippedCount =
			Math.max(0, topLine.length - SHORTHAND_LINE_BUDGET) +
			Math.max(0, bottomLine.length - SHORTHAND_LINE_BUDGET);

		if (visibleTotal < bestCandidate.visibleTotal) continue;
		if (visibleTotal === bestCandidate.visibleTotal) {
			if (clippedCount > bestCandidate.clippedCount) continue;
			if (
				clippedCount === bestCandidate.clippedCount &&
				visibleBottom <= bestCandidate.visibleBottom
			) {
				continue;
			}
		}

		bestCandidate = {
			formatted: `${topLine}\n${bottomLine}`,
			visibleTotal,
			visibleBottom,
			clippedCount,
		};
	}

	return bestCandidate;
};

const buildShorthandCandidates = (words) => {
	const candidates = new Set();
	const meaningfulWordIndexes = words
		.map((word, index) => ({ index, filler: isFillerWord(word) }))
		.filter((entry) => !entry.filler)
		.map((entry) => entry.index);
	const selectedWordIndexes = words
		.map((word, index) => ({ index, weight: getWordWeight(word) }))
		.filter((entry) => entry.weight > 0)
		.sort((left, right) => right.weight - left.weight || left.index - right.index)
		.slice(0, Math.min(SHORTHAND_MAX_WORDS + 2, words.length))
		.map((entry) => entry.index)
		.sort((left, right) => left - right);

	const addCandidate = (indexes) => {
		if (!indexes.length) return;
		const text = indexes.map((index) => words[index]).join(" ").trim();
		if (!text) return;
		candidates.add(text);
	};

	addCandidate(words.map((_, index) => index));
	addCandidate(meaningfulWordIndexes);
	addCandidate(selectedWordIndexes);

	for (const index of selectedWordIndexes) {
		addCandidate([index]);
	}

	for (let size = 2; size <= SHORTHAND_MAX_WORDS; size += 1) {
		const visit = (startIndex, picked) => {
			if (picked.length === size) {
				addCandidate(picked);
				return;
			}

			for (let cursor = startIndex; cursor < selectedWordIndexes.length; cursor += 1) {
				visit(cursor + 1, [...picked, selectedWordIndexes[cursor]]);
			}
		};

		visit(0, []);
	}

	return [...candidates];
};

export const getDefaultEmbeddedActionShorthand = (actionName = "") => {
	const words = tokenizeShorthandWords(actionName);
	if (words.length === 0) return "";
	const hardFilteredWords = words.filter((word) => !isFillerWord(word));
	const candidateWords = hardFilteredWords.length > 0 ? hardFilteredWords : words;

	const candidates = buildShorthandCandidates(candidateWords);
	let bestCandidate = "";
	let bestScore = null;

	for (const candidate of candidates) {
		const split = chooseBestShorthandSplit(candidate);
		const candidateWords = tokenizeShorthandWords(candidate);
		const wordWeight = candidateWords.reduce((total, word) => {
			return total + Math.max(0, getWordWeight(word));
		}, 0);
		const fillerCount = candidateWords.filter((word) => isFillerWord(word)).length;
		const score = {
			visibleTotal: split.visibleTotal,
			clippedCount: split.clippedCount,
			fillerCount,
			wordWeight,
			visibleBottom: split.visibleBottom,
			wordCount: candidateWords.length,
		};

		if (!bestScore) {
			bestCandidate = candidate;
			bestScore = score;
			continue;
		}

		const isBetter =
			score.visibleTotal > bestScore.visibleTotal ||
			(score.visibleTotal === bestScore.visibleTotal &&
				score.clippedCount < bestScore.clippedCount) ||
			(score.visibleTotal === bestScore.visibleTotal &&
				score.clippedCount === bestScore.clippedCount &&
				score.fillerCount < bestScore.fillerCount) ||
			(score.visibleTotal === bestScore.visibleTotal &&
				score.clippedCount === bestScore.clippedCount &&
				score.fillerCount === bestScore.fillerCount &&
				score.wordWeight > bestScore.wordWeight) ||
			(score.visibleTotal === bestScore.visibleTotal &&
				score.clippedCount === bestScore.clippedCount &&
				score.fillerCount === bestScore.fillerCount &&
				score.wordWeight === bestScore.wordWeight &&
				score.visibleBottom > bestScore.visibleBottom) ||
			(score.visibleTotal === bestScore.visibleTotal &&
				score.clippedCount === bestScore.clippedCount &&
				score.fillerCount === bestScore.fillerCount &&
				score.wordWeight === bestScore.wordWeight &&
				score.visibleBottom === bestScore.visibleBottom &&
				score.wordCount < bestScore.wordCount);

		if (!isBetter) continue;
		bestCandidate = candidate;
		bestScore = score;
	}

	return bestCandidate;
};

export const formatEmbeddedActionShorthand = (value) => {
	const text = String(value ?? "").trim();
	if (!text) return "";
	return chooseBestShorthandSplit(text).formatted;
};

export const renderEmbeddedActionShorthand = (value) => {
	const formatted = formatEmbeddedActionShorthand(value);
	if (!formatted) return "";
	return formatted
		.split("\n")
		.map((line) => foundry.utils.escapeHTML(line))
		.join("<br>");
};

export const resolveEmbeddedActionShorthand = ({
	shorthand = "",
	actionName = "",
	preferGenerated = false,
} = {}) => {
	const trimmedShorthand = String(shorthand ?? "").trim();
	const trimmedActionName = String(actionName ?? "").trim();
	if (!trimmedActionName) return trimmedShorthand;

	const generated = getDefaultEmbeddedActionShorthand(trimmedActionName);
	if (!trimmedShorthand) return generated;
	if (trimmedShorthand === trimmedActionName) {
		return generated;
	}

	if (preferGenerated) {
		const generatedWords = tokenizeShorthandWords(generated).filter(
			(word) => !isFillerWord(word),
		);
		const shorthandWords = tokenizeShorthandWords(trimmedShorthand).filter(
			(word) => !isFillerWord(word),
		);

		const firstGenerated = normalizeWordForWeight(generatedWords[0] ?? "");
		const firstShorthand = normalizeWordForWeight(shorthandWords[0] ?? "");
		if (
			shorthandWords.length === 1 &&
			generatedWords.length >= 2 &&
			firstGenerated &&
			firstShorthand === firstGenerated
		) {
			return generated;
		}
	}

	return trimmedShorthand;
};

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
