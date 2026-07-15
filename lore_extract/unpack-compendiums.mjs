import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [, , destination = ".pack-before"] = process.argv;
const manifest = JSON.parse(fs.readFileSync("system.json", "utf8"));

execFileSync(
	"npx",
	["--no-install", "fvtt", "package", "workon", manifest.id, "--type", "System"],
	{ stdio: "inherit" },
);

for (const pack of manifest.packs ?? []) {
	const packDirectory = path.resolve(pack.path);
	if (!fs.existsSync(packDirectory)) continue;

	const outputDirectory = path.join(destination, pack.name);
	fs.mkdirSync(outputDirectory, { recursive: true });
	execFileSync(
		"npx",
		["--no-install", "fvtt", "package", "unpack", pack.name, "--outputDirectory", outputDirectory],
		{ stdio: "inherit" },
	);
}
