export const FATIGUE_MAX = 6;
export const FATIGUE_UNCONSCIOUS_STATUS_ID = "nalfa-fatigue-unconscious";

const FATIGUE_EFFECTS = Object.freeze([
	{ skillPenalty: 0, movementPenalty: 0, attackPenalty: 0, defensePenalty: 0 },
	{ skillPenalty: -1, movementPenalty: 0, attackPenalty: 0, defensePenalty: 0 },
	{ skillPenalty: -2, movementPenalty: -2, attackPenalty: 0, defensePenalty: 0 },
	{ skillPenalty: -3, movementPenalty: -2, attackPenalty: -1, defensePenalty: -1 },
	{
		skillPenalty: -4,
		movementPenalty: -4,
		attackPenalty: -2,
		defensePenalty: -2,
		healthCap: 0.8,
	},
	{
		skillPenalty: -5,
		movementPenalty: -6,
		attackPenalty: -3,
		defensePenalty: -3,
		healthCap: 0.5,
	},
	{
		skillPenalty: -5,
		movementPenalty: -6,
		attackPenalty: -3,
		defensePenalty: -3,
		healthCap: 0.5,
		isUnconscious: true,
	},
]);

const REST_QUALITY_BANDS = Object.freeze([
	{ min: Number.NEGATIVE_INFINITY, max: 0, label: "Misérable" },
	{ min: 1, max: 2, label: "Mauvaise" },
	{ min: 3, max: 4, label: "Légère" },
	{ min: 5, max: 6, label: "Correcte" },
	{ min: 7, max: 8, label: "Bonne" },
	{ min: 9, max: Number.POSITIVE_INFINITY, label: "Complète" },
]);

const restResult = (percent, fatigueReduction = 0) =>
	Object.freeze({ percent, fatigueReduction });

const REST_TABLE = Object.freeze({
	1: Object.freeze([
		restResult(0),
		restResult(0),
		restResult(5),
		restResult(10),
		restResult(20),
		restResult(40),
	]),
	2: Object.freeze([
		restResult(0),
		restResult(5),
		restResult(10),
		restResult(20),
		restResult(40),
		restResult(60),
	]),
	4: Object.freeze([
		restResult(0),
		restResult(10),
		restResult(20),
		restResult(40),
		restResult(60),
		restResult(80, 1),
	]),
	8: Object.freeze([
		restResult(0),
		restResult(20),
		restResult(40),
		restResult(60, 1),
		restResult(80, 2),
		restResult(100, 3),
	]),
	24: Object.freeze([
		restResult(0),
		restResult(40),
		restResult(60, 1),
		restResult(80, 2),
		restResult(100, 3),
		restResult(100, 4),
	]),
});

export const normalizeFatigue = (value) => {
	const number = Number(value);
	if (!Number.isFinite(number)) return 0;
	return Math.min(FATIGUE_MAX, Math.max(0, Math.trunc(number)));
};

export const getFatigueEffects = (value) => {
	const level = normalizeFatigue(value);
	return {
		level,
		healthCap: 1,
		isUnconscious: false,
		...FATIGUE_EFFECTS[level],
	};
};

export const getFatigueHealthMax = (uncappedMax, fatigue) => {
	const maximum = Math.max(1, Number(uncappedMax) || 1);
	const { healthCap } = getFatigueEffects(fatigue);
	return Math.max(1, Math.round(maximum * healthCap));
};

export const getFatigueSummary = (value) => {
	const effects = getFatigueEffects(value);
	if (effects.level === 0) return "Aucune fatigue en cours";

	const parts = [];
	if (effects.isUnconscious) parts.push("Inconscient");
	parts.push(`${effects.skillPenalty} JdC`);
	if (effects.movementPenalty) {
		parts.push(`${effects.movementPenalty} m Déplacement`);
	}
	if (effects.attackPenalty) {
		parts.push(`${effects.attackPenalty} JdT et Défense`);
	}
	if (effects.healthCap < 1) {
		parts.push(`PV max ${Math.round(effects.healthCap * 100)} %`);
	}
	return parts.join(" · ");
};

const getRestQualityIndex = (quality) => {
	const normalizedQuality = Math.trunc(Number(quality) || 0);
	return REST_QUALITY_BANDS.findIndex(
		({ min, max }) => normalizedQuality >= min && normalizedQuality <= max,
	);
};

export const getRestResult = (duration, quality) => {
	const requestedDuration = Number(duration);
	const normalizedDuration = REST_TABLE[requestedDuration] ? requestedDuration : 1;
	const qualityIndex = Math.max(0, getRestQualityIndex(quality));
	const qualityBand = REST_QUALITY_BANDS[qualityIndex];
	const result = REST_TABLE[normalizedDuration][qualityIndex];
	return {
		duration: normalizedDuration,
		quality: Math.trunc(Number(quality) || 0),
		qualityLabel: qualityBand.label,
		...result,
	};
};

export const getRestRecoveryAmount = (maximum, percent) => {
	const normalizedMax = Math.max(0, Number(maximum) || 0);
	const normalizedPercent = Math.max(0, Number(percent) || 0);
	if (normalizedMax === 0 || normalizedPercent === 0) return 0;
	return Math.max(1, Math.round((normalizedMax * normalizedPercent) / 100));
};

export const registerFatigueStatus = () => {
	CONFIG.statusEffects[FATIGUE_UNCONSCIOUS_STATUS_ID] = {
		id: FATIGUE_UNCONSCIOUS_STATUS_ID,
		name: "Inconscient (Fatigue)",
		img: "icons/svg/unconscious.svg",
		type: "base",
		disabled: false,
		transfer: false,
		origin: null,
		description: "<p>Inconscient à cause de la fatigue.</p>",
		statuses: [FATIGUE_UNCONSCIOUS_STATUS_ID],
		showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
		hud: false,
	};
};

export const syncActorFatigueState = async (
	actor,
	{ options = {}, userId = null } = {},
) => {
	if (actor?.type !== "Character") return;
	if (userId && userId !== game.user?.id) return;
	if (options.nalfaFatigueSync) return;

	const effects = getFatigueEffects(actor.system.attributes?.exhaustion);
	const hp = actor.system.attributes?.hp ?? {};
	const hpValue = Number(hp.value ?? 0);
	const hpMax = Math.max(1, Number(hp.max ?? 1));
	const movement = actor.system.actions?.movement ?? {};
	const movementValue = Number(movement.value ?? 0);
	const movementMax = Math.max(0, Number(movement.max ?? 0));
	const updates = {};
	if (Number.isFinite(hpValue) && hpValue > hpMax) {
		updates["system.attributes.hp.value"] = hpMax;
	}
	if (Number.isFinite(movementValue) && movementValue > movementMax) {
		updates["system.actions.movement.value"] = movementMax;
	}
	if (Object.keys(updates).length > 0) {
		await actor.update(updates, { nalfaFatigueSync: true });
	}

	const hasStatus = actor.statuses?.has(FATIGUE_UNCONSCIOUS_STATUS_ID) ?? false;
	if (hasStatus !== effects.isUnconscious) {
		await actor.toggleStatusEffect(FATIGUE_UNCONSCIOUS_STATUS_ID, {
			active: effects.isUnconscious,
			overlay: effects.isUnconscious,
		});
	}
};
