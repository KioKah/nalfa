import { applyManualTargetOutcome } from "../rolls/actions/context.mjs";

const getContextEntryMessage = (entry) => {
	const messageId = entry?.dataset?.messageId ?? "";
	if (!messageId) return null;
	return game.messages?.get(messageId) ?? null;
};

const isNalfaRollCardEntry = (entry) => {
	if (entry?.querySelector(".nalfa-roll-card")) return true;

	const message = getContextEntryMessage(entry);
	if (!message) return false;
	const content = String(message.content ?? "");
	return content.includes("nalfa-roll-card");
};

const getActionSheetFlag = (message) => {
	const flag = message?.getFlag?.("nalfa", "actionSheet");
	if (!flag || typeof flag !== "object") return null;

	const sourceItemUuid = String(flag.sourceItemUuid ?? "").trim();
	if (!sourceItemUuid) return null;

	return {
		sourceItemUuid,
	};
};

const getDamageSummaryFlag = (message) => {
	const flag = message?.getFlag?.("nalfa", "damageSummary");
	if (!flag || typeof flag !== "object") return null;
	const rows = Array.isArray(flag.rows) ? flag.rows.filter((row) => row?.targetActorUuid) : [];
	if (!rows.length) return null;
	return {
		reverted: flag.reverted === true,
		rows,
	};
};

const hasActionSheetContext = (entry) => {
	const message = getContextEntryMessage(entry);
	if (!message) return false;
	if (!isNalfaRollCardEntry(entry)) return false;
	return Boolean(getActionSheetFlag(message));
};

const openActionSheetFromEntry = async (entry) => {
	const message = getContextEntryMessage(entry);
	const actionSheetFlag = getActionSheetFlag(message);
	if (!actionSheetFlag) {
		ui.notifications.warn("Aucune fiche d'action liée.");
		return;
	}

	const sourceItem = await fromUuid(actionSheetFlag.sourceItemUuid);
	if (!(sourceItem instanceof Item)) {
		ui.notifications.warn("Action liée introuvable.");
		return;
	}

	if (!sourceItem.sheet) {
		ui.notifications.warn("Impossible d'ouvrir la fiche d'action.");
		return;
	}

	sourceItem.sheet.render(true);
};

const dismissChatMessage = async (message, button, root) => {
	const canDelete = message?.canUserModify?.(game.user, "delete") === true;
	if (canDelete) {
		await message.delete();
		return;
	}

	const messageElement =
		button?.closest?.(".message") ?? root?.closest?.(".message") ?? root ?? null;
	messageElement?.remove?.();
};

const markDamageSummaryEntryReverted = (entry) => {
	entry?.querySelectorAll?.(".nalfa-roll-card")?.forEach?.((card) => {
		card.classList.add("nalfa-roll-card--reverted");
	});
};

const revertDamageSummaryChanges = async (message, entry = null) => {
	const flag = getDamageSummaryFlag(message);
	if (!flag || flag.reverted) return false;

	for (const row of flag.rows) {
		const actorDoc = await fromUuid(String(row.targetActorUuid ?? "").trim());
		const actor = actorDoc?.actor ?? actorDoc;
		if (!(actor instanceof Actor) || !actor.update) continue;

		await actor.update({
			"system.attributes.hp.value": Number(row.previousHp ?? 0),
			"system.attributes.hp.abso": Math.max(0, Number(row.previousTempHp ?? 0)),
		});
	}

	await message.setFlag("nalfa", "damageSummary", {
		...flag,
		reverted: true,
	});
	markDamageSummaryEntryReverted(entry);
	ui.notifications.info("Changements de dégâts annulés.");
	return true;
};

export const registerChatHooks = () => {
	Hooks.on("renderChatMessageHTML", (message, html) => {
		const root = html?.querySelector ? html : null;
		if (!root) return;
		const damageSummaryFlag = getDamageSummaryFlag(message);
		if (damageSummaryFlag?.reverted) {
			root.querySelectorAll(".nalfa-roll-card").forEach((card) => {
				card.classList.add("nalfa-roll-card--reverted");
			});
		}

		root.querySelectorAll(".nalfa-chat-card").forEach((card) => {
			if (card.classList.contains("nalfa-chat-card--prompt")) return;
			if (card.dataset.nalfaToggle) return;
			card.dataset.nalfaToggle = "true";
			card.addEventListener("click", () => {
				card.classList.toggle("is-open");
			});
		});

		root.querySelectorAll(".nalfa-roll-prompt").forEach((button) => {
			if (button.dataset.nalfaPrompt) return;
			button.dataset.nalfaPrompt = "true";
			button.addEventListener("click", async (event) => {
				event.preventDefault();
				const target = event.currentTarget;
				const statKey = target?.dataset?.stat ?? "";
				const statLabel = String(target?.dataset?.statLabel ?? "").trim();
				const statValue = Number(target?.dataset?.statValue ?? NaN);
				const dc = Number(target?.dataset?.dc ?? 0);
				const titleName = target?.dataset?.name ?? "";
				const targetTokenUuid = String(target?.dataset?.targetTokenUuid ?? "").trim();
				const targetActorUuid = String(target?.dataset?.targetActorUuid ?? "").trim();
				const sourceTokenUuid = String(target?.dataset?.sourceTokenUuid ?? "").trim();
				const sourceTokenName = String(target?.dataset?.sourceTokenName ?? "").trim();
				const contextId = String(target?.dataset?.contextId ?? "").trim();
				const sourceItemUuid = String(target?.dataset?.sourceItemUuid ?? "").trim();
				const actionIndex = Number(target?.dataset?.actionIndex ?? -1);
				const actionName = String(target?.dataset?.actionName ?? titleName).trim();
				const rollBonus = Number(target?.dataset?.rollBonus ?? 0);
				const rollMode = String(target?.dataset?.rollMode ?? "normal").trim();
				const autoNatural = target?.dataset?.autoNatural === "true";
				const resolvedTarget = targetTokenUuid
					? await fromUuid(targetTokenUuid)
					: (targetActorUuid ? await fromUuid(targetActorUuid) : null);
				const targetToken = resolvedTarget?.object ?? resolvedTarget;
				const targetedPrompt = Boolean(targetTokenUuid || targetActorUuid);
				const actor = targetedPrompt
					? (targetToken?.actor ?? (resolvedTarget instanceof Actor ? resolvedTarget : null))
					: (canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null);
				if (!actor) {
					ui.notifications.warn(
						targetedPrompt
							? "Impossible de retrouver l'acteur pour cette sauvegarde."
							: "Veuillez sélectionner une cible.",
					);
					return;
				}
				const result = await game.nalfa?.rolls?.rollSaveTarget?.(actor, statKey, dc, titleName, {
					targetToken,
					statName: statLabel,
					statValue,
					sourceTokenUuid,
					versusName: sourceTokenName,
					rollContext: { contextId },
					chatContext: {
						sourceItemUuid,
						actionIndex: Number.isInteger(actionIndex) ? actionIndex : -1,
						actionName,
					},
					promptAdjustments: event.altKey,
					adjustments: event.altKey
						? null
						: {
							bonus: Number.isFinite(rollBonus) ? rollBonus : 0,
							mode: rollMode,
						},
					autoNatural,
				});
				if (result) {
					await dismissChatMessage(message, target, root);
				}
			});
		});

		root.querySelectorAll(".nalfa-manual-outcome-apply").forEach((button) => {
			if (button.dataset.nalfaManualOutcome) return;
			button.dataset.nalfaManualOutcome = "true";
			button.addEventListener("click", async (event) => {
				event.preventDefault();
				if (!game.user?.isGM) {
					ui.notifications.warn("Seul le MJ peut appliquer cette demande.");
					return;
				}

				const target = event.currentTarget;
				const sourceTokenUuid = String(target?.dataset?.sourceTokenUuid ?? "").trim();
				const targetTokenUuid = String(target?.dataset?.targetTokenUuid ?? "").trim();
				const contextId = String(target?.dataset?.contextId ?? "").trim();
				const sourceItemUuid = String(target?.dataset?.sourceItemUuid ?? "").trim();
				const actionIndex = Number(target?.dataset?.actionIndex ?? -1);
				const actionName = String(target?.dataset?.actionName ?? "").trim();
				const hasAttack = target?.dataset?.hasAttack === "true";
				const hasSave = target?.dataset?.hasSave === "true";
				const attackOutcome = String(target?.dataset?.attackOutcome ?? "").trim();
				const saveOutcome = String(target?.dataset?.saveOutcome ?? "").trim();
				const defenseValue = Number(target?.dataset?.defense ?? NaN);
				const dcValue = Number(target?.dataset?.dc ?? NaN);
				const casterTokenName = String(target?.dataset?.casterTokenName ?? "").trim();

				const result = await applyManualTargetOutcome({
					sourceTokenUuid,
					targetTokenUuid,
					rollContext: {
						contextId,
						sourceItemUuid,
						actionIndex: Number.isInteger(actionIndex) ? actionIndex : -1,
						actionName,
					},
					attack: hasAttack
						? (attackOutcome
							? {
								isSuccess: attackOutcome === "success" || attackOutcome === "crit",
								isCrit: attackOutcome === "crit",
								isFumble: attackOutcome === "fumble",
								defense: Number.isFinite(defenseValue) ? defenseValue : null,
								rollTotal: null,
							}
							: null)
						: undefined,
					save: hasSave
						? (saveOutcome
							? {
								isSuccess: saveOutcome === "success",
								dc: Number.isFinite(dcValue) ? dcValue : null,
								rollTotal: null,
								casterTokenName,
							}
							: null)
						: undefined,
				});
				if (!result) {
					ui.notifications.warn("Impossible d'appliquer la demande.");
					return;
				}

				await dismissChatMessage(message, target, root);
			});
		});
	});

	Hooks.on("getChatMessageContextOptions", (chatLog, entryOptions) => {
		void chatLog;
		entryOptions.push({
			name: "Ouvrir la fiche d'action",
			icon: '<i class="fa-solid fa-book-open"></i>',
			condition: (entry) => hasActionSheetContext(entry),
			callback: (entry) => {
				void openActionSheetFromEntry(entry);
			},
		});
		entryOptions.push({
			name: "Annuler les changements",
			icon: '<i class="fa-solid fa-reply"></i>',
			condition: (entry) => {
				const message = getContextEntryMessage(entry);
				const flag = getDamageSummaryFlag(message);
				return Boolean(flag && !flag.reverted);
			},
			callback: (entry) => {
				const message = getContextEntryMessage(entry);
				if (!message) return;
				void revertDamageSummaryChanges(message, entry);
			},
		});
	});
};
