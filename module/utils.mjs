import { prepareCurrency } from "./prepareItems/currency.mjs";

const { enrichHTML: foundryEnrichHTML } = foundry.applications.ux.TextEditor;

export function round(value, decimals = 6) {
	return Number(Math.round(value * 10 ** decimals) / 10 ** decimals);
}
export function clamp(value, minValue, maxValue) {
	return Math.min(Math.max(value, minValue), maxValue);
}

export async function enrichHTML(string, owner) {
	if (string === undefined) return undefined;
	return await foundryEnrichHTML(string, {
		secrets: owner,
		async: true,
	});
}

export function prepareItem(sysData, itemType) {
	const prepareMap = {
		Weapon: () => {} /* Future implementation */,
		Trinket: () => {} /* Future implementation */,
		Tool: () => {} /* Future implementation */,
		Backpack: () => {} /* Future implementation */,
		Consumable: () => {} /* Future implementation */,
		Loot: () => {} /* Future implementation */,
		Book: () => {} /* Future implementation */,
		Spell: () => {} /* Future implementation */,
		Currency: prepareCurrency,
		Race: () => {} /* Future implementation */,
		Class: () => {} /* Future implementation */,
		Job: () => {} /* Future implementation */,
		CombatStyle: () => {} /* Future implementation */,
		Status: () => {} /* Future implementation */,
		WeaponAttribute: () => {} /* Future implementation */,
		TestItem: () => {} /* Future implementation */,
	};
	const prepare = prepareMap[itemType];

	if (prepare) {
		prepare(sysData);
	} else {
		console.error(`nalfa | NalfaItemSheet | Item type "${itemType}" not recognized.`);
	}
}

// export function applyMutationObserver(target) {
// 	// Check if the target is the div with class "nalfa" // TODO "nalfa sheet"
// 	if (!target.classList.contains("nalfa")) return;

// 	// Check if the observer has already been set up for this target
// 	if (target.hasSetupMutationObserver) return;
// 	target.hasSetupMutationObserver = true;

// 	const trackedIframes = new Set();

// 	// Function to inject CSS into the document
// 	function applyGlobalCSS() {
// 		if (!document.getElementById("globalCssStyle")) {
// 			var style = document.createElement("style");
// 			style.id = "globalCssStyle";
// 			style.type = "text/css";
// 			var cssRules = `
// 				.tox-tinymce-aux .tox-menu.tox-collection.tox-collection--list {
// 					background-color: gray !important;
// 				}
// 			`;
// 			if (style.styleSheet) {
// 				style.styleSheet.cssText = cssRules;
// 			} else {
// 				style.appendChild(document.createTextNode(cssRules));
// 			}
// 			document.head.appendChild(style);
// 		}
// 	}

// 	// Function to remove global CSS
// 	function removeGlobalCSS() {
// 		var style = document.getElementById("globalCssStyle");
// 		if (style) {
// 			style.parentNode.removeChild(style);
// 		}
// 	}

// 	// Function to inject CSS into an iframe
// 	function injectCSS(iframe) {
// 		var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

// 		var style = document.createElement("style");
// 		// style.type = "text/css";

// 		var cssRules = `
// 			@font-face {
// 				font-family: "Lexend";
// 				font-style: normal;
// 				font-weight: 400;
// 				font-display: swap;
// 				src: url(https://fonts.gstatic.com/s/lexend/v19/wlptgwvFAVdoq2_F94zlCfv0bz1WCzsWzLdneg.woff2)
// 				format("woff2");
// 				unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
// 				U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212,
// 				U+2215, U+FEFF, U+FFFD;
// 			}
// 			body {
// 				font-family: "Lexend" !important;
// 				font-size: 14px !important;
// 				color: #FFF !important;
// 			}
// 		`;

// 		if (style.styleSheet) {
// 			style.styleSheet.cssText = cssRules;
// 		} else {
// 			style.appendChild(document.createTextNode(cssRules));
// 		}

// 		iframeDoc.head.appendChild(style);
// 	}

// 	// Function to handle iframe removal
// 	function handleIframeRemoval(iframe) {
// 		console.log(`Iframe with ID ${iframe.id} has been removed.`);
// 		trackedIframes.delete(iframe);
// 		if (trackedIframes.size === 0) {
// 			removeGlobalCSS();
// 		}
// 	}

// 	if (target) {
// 		// Monitor for iframe creation and removal
// 		var observer = new MutationObserver(function (mutations) {
// 			mutations.forEach(function (mutation) {
// 				// Check for added nodes
// 				mutation.addedNodes.forEach(function (node) {
// 					if (
// 						node.tagName === "IFRAME" &&
// 						/^mce_\d+_ifr$/.test(node.id) &&
// 						!trackedIframes.has(node)
// 					) {
// 						console.log(`Iframe with ID ${node.id} has been added.`);
// 						trackedIframes.add(node);
// 						node.onload = function () {
// 							injectCSS(node);
// 							applyGlobalCSS();
// 						};
// 					}
// 				});

// 				// Check for removed nodes
// 				mutation.removedNodes.forEach(function (node) {
// 					if (node.tagName === "IFRAME" && trackedIframes.has(node)) {
// 						handleIframeRemoval(node);
// 					}
// 				});
// 			});
// 		});

// 		// Start observing the target for added and removed iframes
// 		observer.observe(target, {
// 			childList: true,
// 			subtree: true,
// 		});

// 		// Fallback detection for iframe removal
// 		setInterval(function () {
// 			trackedIframes.forEach(function (iframe) {
// 				if (!target.contains(iframe)) {
// 					handleIframeRemoval(iframe);
// 				}
// 			});
// 		}, 1000); // Check every second

// 		console.log("MutationObserver has been set up for .nalfa.sheet.");
// 	} else {
// 		console.log(".nalfa.sheet not found.");
// 	}
// }
