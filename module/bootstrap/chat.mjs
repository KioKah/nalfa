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

export const registerChatHooks = () => {
	Hooks.on("renderChatMessageHTML", (message, html) => {
		void message;
		const root = html?.querySelector ? html : null;
		if (!root) return;

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
			button.addEventListener("click", (event) => {
				event.preventDefault();
				const target = event.currentTarget;
				const statKey = target?.dataset?.stat ?? "";
				const dc = Number(target?.dataset?.dc ?? 0);
				const titleName = target?.dataset?.name ?? "";
				const actor =
					canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null;
				if (!actor) {
					ui.notifications.warn("Veuillez sélectionner une cible.");
					return;
				}
				game.nalfa?.rolls?.rollSaveTarget?.(actor, statKey, dc, titleName);
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
	});
};
