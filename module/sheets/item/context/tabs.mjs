export const buildVisibleTabs = ({
	embeddedActionsTabLabel,
	activeTab,
	hasSpecific,
	isIdentificationLocked,
	item,
	rawTabs,
	showModifiersTab,
	showEmbeddedActionsTab,
}) => {
	const tabIds = [];
	if (isIdentificationLocked) {
		tabIds.push("description");
	} else {
		if (hasSpecific) tabIds.push("specific");
		if (showEmbeddedActionsTab) tabIds.push("actionable");
		if (showModifiersTab) tabIds.push("modifiers");
		tabIds.push("description");
	}

	const resolvedActiveTab = tabIds.includes(activeTab) ? activeTab : tabIds[0];
	const specificTabLabel = item.type;
	const tabs = {};

	for (const tabId of tabIds) {
		const tab = rawTabs[tabId] ?? { id: tabId };
		const tabLabel =
			tabId === "specific"
				? specificTabLabel
				: tabId === "actionable"
					? embeddedActionsTabLabel
					: tab.label;
		tabs[tabId] = {
			...tab,
			label: tabLabel,
			cssClass: tabId === resolvedActiveTab ? "active" : "",
		};
	}

	return {
		tabs,
		activeTab: resolvedActiveTab,
	};
};
