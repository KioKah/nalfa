import * as fs from "fs";
import yaml from "js-yaml";
import path from "path";

console.log("Reforging Symlinks");

if (fs.existsSync("foundry-config.yaml")) {
	let fileRoot = "";
	try {
		const fc = await fs.promises.readFile("foundry-config.yaml", "utf-8");
		const foundryConfig = yaml.load(fc);
		// As of v13.338, Node installs are not nested, but Electron installs are
		const nested = fs.existsSync(path.join(foundryConfig.installPath, "resources", "app"));
		if (nested) fileRoot = path.join(foundryConfig.installPath, "resources", "app");
		else fileRoot = foundryConfig.installPath;
	} catch (err) {
		console.error(`Error reading foundry-config.yaml: ${err}`);
		process.exit(1);
	}

	// Ensure local 'foundry/' directory exists
	try {
		await fs.promises.mkdir("foundry");
	} catch (e) {
		if (e.code !== "EEXIST") throw e;
	}

	// Symlink the main folders
	for (const p of ["client", "common", "tsconfig.json"]) {
		try {
			await fs.promises.symlink(
				path.join(fileRoot, p),
				path.join("foundry", p),
				"junction"
			);
		} catch (e) {
			if (e.code !== "EEXIST") throw e;
		}
	}
	// Also symlink the language files
	try {
		await fs.promises.symlink(
			path.join(fileRoot, "public", "lang"),
			path.join("foundry", "lang"),
			"junction"
		);
	} catch (e) {
		if (e.code !== "EEXIST") throw e;
	}
} else {
	console.log("foundry-config.yaml not found—skipping symlinks.");
}
