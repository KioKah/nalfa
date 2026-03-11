import {
	handleAddEmbeddedAction,
	handleDetachEmbeddedActionSource,
	handleEditEmbeddedAction,
	handleEmbeddedActionDragOver,
	handleEmbeddedActionDragStart,
	handleEmbeddedActionDrop,
	handleOpenEmbeddedActionSource,
	handleRefreshEmbeddedActionSource,
	handleRemoveEmbeddedAction,
	handleUseEmbeddedAction,
} from "./actions/embedded.mjs";
import { PRIMARY_TAB_GROUP } from "./constants.mjs";
import {
	handleAddArrayEntry,
	handleChangeEquippedSlot,
	handleChangeModifierCategory,
	handleOpenRichTextEditor,
	handleRemoveArrayEntry,
	handleToggleIdentified,
	handleToggleNeedsIdentification,
} from "./handlers.mjs";

const bindElements = (sheet, selector, eventName, handler) => {
	sheet.element?.querySelectorAll(selector).forEach((element) => {
		element.addEventListener(eventName, (event) => {
			void handler(sheet, event);
		});
	});
};

const bindEmbeddedActionDropZone = (sheet) => {
	const zone = sheet.element?.querySelector("[data-drop-zone='embedded-actions']");
	if (!zone) return;

	zone.addEventListener("dragover", (event) => {
		void handleEmbeddedActionDragOver(sheet, event);
	});
	zone.addEventListener("drop", (event) => {
		void handleEmbeddedActionDrop(sheet, event);
	});
};

export const restoreItemSheetTabs = (sheet) => {
	if (sheet._nextPrimaryTab && sheet.tabGroups) {
		sheet.tabGroups[PRIMARY_TAB_GROUP] = sheet._nextPrimaryTab;
	}
	sheet._nextPrimaryTab = null;

	if (sheet.tabGroups) {
		for (const [group, active] of Object.entries(sheet.tabGroups)) {
			if (active) sheet.changeTab(active, group);
		}
	}
};

export const bindItemSheetInteractions = (sheet) => {
	bindElements(sheet, "[data-action='use-embedded-action']", "click", handleUseEmbeddedAction);
	bindElements(
		sheet,
		"[data-draggable='embedded-action']",
		"dragstart",
		handleEmbeddedActionDragStart,
	);
	bindEmbeddedActionDropZone(sheet);

	if (!sheet.isEditable) return;

	bindElements(sheet, "[data-action='add-array-entry']", "click", handleAddArrayEntry);
	bindElements(
		sheet,
		"[data-action='remove-array-entry']",
		"click",
		handleRemoveArrayEntry,
	);
	bindElements(
		sheet,
		"[data-action='add-embedded-action']",
		"click",
		handleAddEmbeddedAction,
	);
	bindElements(
		sheet,
		"[data-action='edit-embedded-action']",
		"click",
		handleEditEmbeddedAction,
	);
	bindElements(
		sheet,
		"[data-action='remove-embedded-action']",
		"click",
		handleRemoveEmbeddedAction,
	);
	bindElements(
		sheet,
		"[data-action='refresh-embedded-action-source']",
		"click",
		handleRefreshEmbeddedActionSource,
	);
	bindElements(
		sheet,
		"[data-action='open-embedded-action-source']",
		"click",
		handleOpenEmbeddedActionSource,
	);
	bindElements(
		sheet,
		"[data-action='detach-embedded-action-source']",
		"click",
		handleDetachEmbeddedActionSource,
	);
	bindElements(
		sheet,
		"[data-action='change-equipped-slot']",
		"change",
		handleChangeEquippedSlot,
	);
	bindElements(
		sheet,
		"input[name='system.identification.needs_identification']",
		"change",
		handleToggleNeedsIdentification,
	);
	bindElements(
		sheet,
		"input[name='system.identification.identified']",
		"change",
		handleToggleIdentified,
	);
	bindElements(
		sheet,
		"[data-action='change-modifier-category']",
		"change",
		handleChangeModifierCategory,
	);
	bindElements(
		sheet,
		"[data-action='open-richtext-editor']",
		"click",
		handleOpenRichTextEditor,
	);
};
