import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [, , archivePath = "../Nalfa.lore"] = process.argv;
const root = import.meta.dirname;
const resolvedArchivePath = path.resolve(root, archivePath);
const temporaryDirectory = path.join(root, ".archive-tmp");
const extractedDataPath = path.join(temporaryDirectory, "data.json");
const extractedImageDirectory = path.join(temporaryDirectory, "img");
const targetDataPath = path.join(root, "data.json");
const targetImageDirectory = path.join(root, "img");

if (!fs.existsSync(resolvedArchivePath)) {
	console.error(`Archive not found: ${resolvedArchivePath}`);
	process.exit(1);
}

fs.rmSync(temporaryDirectory, { recursive: true, force: true });
fs.mkdirSync(temporaryDirectory, { recursive: true });

execFileSync("tar", ["-xf", toShellPath(resolvedArchivePath), "-C", toShellPath(temporaryDirectory)], {
	stdio: "inherit",
});

if (!fs.existsSync(extractedDataPath)) {
	throw new Error(`Archive did not contain data.json: ${resolvedArchivePath}`);
}

fs.copyFileSync(extractedDataPath, targetDataPath);
fs.rmSync(targetImageDirectory, { recursive: true, force: true });

if (fs.existsSync(extractedImageDirectory)) {
	fs.cpSync(extractedImageDirectory, targetImageDirectory, { recursive: true });
}

fs.rmSync(temporaryDirectory, { recursive: true, force: true });

console.log(
	JSON.stringify(
		{
			archivePath: resolvedArchivePath,
			dataPath: targetDataPath,
			imageDirectory: fs.existsSync(targetImageDirectory) ? targetImageDirectory : null,
		},
		null,
		2,
	),
);

function toShellPath(filePath) {
	try {
		return execFileSync("cygpath", ["-u", filePath], { encoding: "utf8" }).trim();
	} catch {
		return filePath;
	}
}
