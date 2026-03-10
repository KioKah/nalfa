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
};
