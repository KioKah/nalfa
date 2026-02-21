const getRichTextDialogValue = (dialog, fallback = "") => {
	const editor = dialog.element?.querySelector("prose-mirror");
	if (!editor) return fallback;
	return String(editor.value ?? "");
};

const focusRichTextDialogEditor = (dialog) => {
	const editable = dialog.element?.querySelector(
		".editor-content[contenteditable='true'], .ProseMirror[contenteditable='true']",
	);
	if (!(editable instanceof HTMLElement)) return;

	editable.focus();

	const selection = window.getSelection();
	if (!selection) return;

	const range = document.createRange();
	range.selectNodeContents(editable);
	range.collapse(false);
	selection.removeAllRanges();
	selection.addRange(range);
};

const bindRichTextDialogCloseSave = (dialog, item, path, initialValue) => {
	const closeButton = dialog.window?.close;
	if (!(closeButton instanceof HTMLElement)) return;

	closeButton.addEventListener("click", () => {
		if (dialog._nalfaSkipAutoSave) return;

		dialog._nalfaSkipAutoSave = true;
		const content = getRichTextDialogValue(dialog, initialValue);
		const currentValue = String(foundry.utils.getProperty(item, path) ?? "");
		if (content === currentValue) return;

		void item.update({ [path]: content });
	});
};

const onRichTextDialogClose = async (dialog, item, path, initialValue) => {
	if (dialog._nalfaSkipAutoSave) return;

	const content = getRichTextDialogValue(dialog, initialValue);
	const currentValue = String(foundry.utils.getProperty(item, path) ?? "");
	if (content === currentValue) return;

	await item.update({ [path]: content });
};

export const openRichTextEditorDialog = (item, path, title = "Éditeur") => {
	const { DialogV2 } = foundry.applications.api;
	const value = String(foundry.utils.getProperty(item, path) ?? "");
	const escapedValue = foundry.utils.escapeHTML(value);

	const dialog = new DialogV2({
		classes: ["nalfa", "sheet", "item-richtext-dialog"],
		window: {
			title,
		},
		position: {
			width: 760,
			height: 560,
		},
		content: `<prose-mirror name="content" value="${escapedValue}"></prose-mirror>`,
		buttons: [
			{
				action: "cancel",
				label: "Annuler",
				callback: (event, target, dialogInstance) => {
					void event;
					void target;
					dialogInstance._nalfaSkipAutoSave = true;
					return "cancel";
				},
			},
			{
				action: "save",
				label: "Enregistrer",
				default: true,
				callback: (event, target, dialogInstance) => {
					void event;
					void target;
					const editor = dialogInstance.element?.querySelector("prose-mirror");
					if (!editor) return value;
					return String(editor.value ?? "");
				},
			},
		],
		submit: async (result) => {
			if (result === "cancel") return;

			dialog._nalfaSkipAutoSave = true;
			const content =
				typeof result === "string" ? result : getRichTextDialogValue(dialog, value);
			await item.update({ [path]: content });
		},
	});

	dialog.addEventListener("render", () => {
		bindRichTextDialogCloseSave(dialog, item, path, value);
		window.setTimeout(() => focusRichTextDialogEditor(dialog), 0);
	});

	dialog.addEventListener("close", () => {
		void onRichTextDialogClose(dialog, item, path, value);
	});

	dialog.render({ force: true });
};
