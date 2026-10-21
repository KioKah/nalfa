import { getActorStateEffects, getActorStateProfile } from "./states.mjs";

const resourceLabels = Object.freeze({
	main: "P",
	secondary: "S",
	reaction: "R",
	movement: "D",
	interaction: "I",
});

const toNumber = (value) => {
	const number = Number(value ?? 0);
	return Number.isFinite(number) ? Math.max(0, number) : 0;
};

const appendText = (element, className, text) => {
	const line = document.createElement("span");
	line.className = className;
	line.textContent = text;
	element.append(line);
};

export const refreshNalfaCombatTracker = (combat = ui.combat?.viewed) => {
	const tracker = ui.combat?.element?.querySelector(".combat-tracker");
	if (!tracker || !combat) return;

	for (const combatant of combat.combatants ?? []) {
		const actor = combatant.actor;
		const row = [...tracker.querySelectorAll("[data-combatant-id]")].find(
			(element) => element.dataset.combatantId === combatant.id,
		);
		if (!actor || !row) continue;
		row.querySelector(".nalfa-combat-tracker")?.remove();

		const summary = document.createElement("div");
		summary.className = "nalfa-combat-tracker";
		const states = getActorStateEffects(actor).map((effect) => effect.name);
		const profile = getActorStateProfile(actor);
		const hp = actor.system?.attributes?.hp ?? {};
		const isKo = Number(hp.value ?? 0) <= 0;
		const isDead = Number(hp.value ?? 0) < -Math.max(1, Number(hp.max ?? 1));
		if (isDead) appendText(summary, "nalfa-combat-tracker__state nalfa-combat-tracker__state--dead", "Mort");
		else if (isKo) appendText(summary, "nalfa-combat-tracker__state nalfa-combat-tracker__state--ko", "KO");
		for (const state of states) appendText(summary, "nalfa-combat-tracker__state", state);

		const blocks = [
			[profile.blocksTurn || profile.blocksAction, "Actions"],
			[profile.blocksAttack, "Attaques"],
			[profile.blocksMovement, "Déplacement"],
			[profile.blocksReaction, "Réactions"],
			[profile.blocksConcentration, "Concentration"],
		]
			.filter(([blocked]) => blocked)
			.map(([, label]) => label);
		if (blocks.length) {
			appendText(summary, "nalfa-combat-tracker__blocks", `Bloqué : ${blocks.join(", ")}`);
		}

		const resources = actor.system?.actions ?? {};
		const resourceSummary = Object.entries(resourceLabels)
			.map(([key, label]) => {
				const resource = resources[key] ?? {};
				return `${label} ${toNumber(resource.value)}/${toNumber(resource.max)}`;
			})
			.join(" · ");
		appendText(summary, "nalfa-combat-tracker__resources", resourceSummary);
		row.querySelector(".token-name")?.after(summary);
	}
};

export const registerNalfaCombatTrackerSummary = () => {
	const trackerClass = foundry.applications.sidebar.tabs.CombatTracker;
	const prototype = trackerClass?.prototype;
	if (!prototype || prototype._nalfaCombatSummaryRegistered) return;
	const onRender = prototype._onRender;
	prototype._onRender = async function (...args) {
		await onRender.call(this, ...args);
		requestAnimationFrame(() => refreshNalfaCombatTracker(this.viewed));
	};
	prototype._nalfaCombatSummaryRegistered = true;
};
