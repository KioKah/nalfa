const getRichTextDialogValue = (dialog, fallback = "") => {
	const editor = dialog.element?.querySelector("prose-mirror");
	if (!editor) return fallback;
	return String(editor.value ?? "");
};

const resolveRichTextSourceValue = ({ item, path, getValue }) => {
	if (typeof getValue === "function") {
		return String(getValue() ?? "");
	}
	if (!item || !path) return "";
	return String(foundry.utils.getProperty(item, path) ?? "");
};

const persistRichTextValue = async ({ item, onSave, path, value }) => {
	if (typeof onSave === "function") {
		await onSave(value);
		return;
	}
	if (!item || !path) return;
	await item.update({ [path]: value });
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

const bindRichTextDialogCloseSave = (dialog, source, initialValue) => {
	const closeButton = dialog.window?.close;
	if (!(closeButton instanceof HTMLElement)) return;

	closeButton.addEventListener("click", () => {
		if (dialog._nalfaSkipAutoSave) return;

		dialog._nalfaSkipAutoSave = true;
		const content = getRichTextDialogValue(dialog, initialValue);
		const currentValue = resolveRichTextSourceValue(source);
		if (content === currentValue) return;

		void persistRichTextValue({ ...source, value: content });
	});
};

const onRichTextDialogClose = async (dialog, source, initialValue) => {
	if (dialog._nalfaSkipAutoSave) return;

	const content = getRichTextDialogValue(dialog, initialValue);
	const currentValue = resolveRichTextSourceValue(source);
	if (content === currentValue) return;

	await persistRichTextValue({ ...source, value: content });
};

export const openRichTextEditorDialog = (
	item,
	path,
	title = "Éditeur",
	{ getValue, onSave } = {},
) => {
	const { DialogV2 } = foundry.applications.api;
	const source = { item, path, getValue, onSave };
	const value = resolveRichTextSourceValue(source);
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
			await persistRichTextValue({ ...source, value: content });
		},
	});

	dialog.addEventListener("render", () => {
		bindRichTextDialogCloseSave(dialog, source, value);
		window.setTimeout(() => focusRichTextDialogEditor(dialog), 0);
	});

	dialog.addEventListener("close", () => {
		void onRichTextDialogClose(dialog, source, value);
	});

	dialog.render({ force: true });
};
