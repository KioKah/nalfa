const { DialogV2 } = foundry.applications.api;

export const ACTION_DIALOG_CLASSES = ["nalfa", "sheet", "nalfa-action-dialog"];

export const waitForActionDialog = (
	dialogConfig,
	{ closeValue = null, onRender = null, onClose = null } = {},
) => {
	return new Promise((resolve) => {
		let settled = false;
		const settle = (value) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};

		const dialog = new DialogV2({
			classes: ACTION_DIALOG_CLASSES,
			...dialogConfig,
			submit: (result) => {
				settle(result);
			},
		});

		if (onRender instanceof Function) {
			dialog.addEventListener("render", () => {
				onRender(dialog);
			});
		}

		dialog.addEventListener("close", () => {
			if (onClose instanceof Function) onClose(dialog);
			settle(closeValue);
		});

		dialog.render({ force: true });
	});
};
