import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [, , destination = ".pack-before"] = process.argv;
const manifest = JSON.parse(fs.readFileSync("system.json", "utf8"));
const dataPath = path.resolve(".foundry-data");
const packagePath = path.join(dataPath, "Data", "systems", manifest.id);

fs.mkdirSync(path.dirname(packagePath), { recursive: true });
if (!fs.existsSync(packagePath)) fs.symlinkSync(process.cwd(), packagePath, "dir");

execFileSync(
	"npx",
	["--no-install", "fvtt", "configure", "set", "dataPath", dataPath],
	{ stdio: "inherit" },
);

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
