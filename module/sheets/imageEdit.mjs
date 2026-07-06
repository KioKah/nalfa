const getFilePickerClass = () =>
	foundry.applications?.apps?.FilePicker?.implementation ?? CONFIG.ux.FilePicker;

const openImagePicker = async (sheet, image) => {
	if (!sheet?.isEditable) return;
	const path = String(image?.dataset?.edit ?? "").trim();
	if (!path) return;

	const FilePickerClass = getFilePickerClass();
	const current = foundry.utils.getProperty(sheet.document._source, path);
	const defaultArtwork = sheet.document.constructor.getDefaultArtwork?.(sheet.document._source) ?? {};
	const defaultImage = foundry.utils.getProperty(defaultArtwork, path);
	const picker = new FilePickerClass({
		type: "image",
		current,
		redirectToRoot: defaultImage ? [defaultImage] : [],
		callback: (selectedPath) => {
			image.src = selectedPath;
			if (sheet.options.form.submitOnChange && sheet.form) {
				sheet.form.dispatchEvent(new Event("submit", { cancelable: true }));
			}
		},
		position: {
			top: sheet.position.top + 40,
			left: sheet.position.left + 10,
		},
		document: sheet.document,
	});
	await picker.browse();
};

export const bindImageEditContextMenu = (sheet) => {
	if (!sheet?.isEditable) return;
	sheet.element?.querySelectorAll("img[data-edit]").forEach((image) => {
		image.addEventListener("contextmenu", (event) => {
			event.preventDefault();
			event.stopPropagation();
			void openImagePicker(sheet, image);
		});
	});
};
