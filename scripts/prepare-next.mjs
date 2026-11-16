import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
const root = fileURLToPath(new URL("../", import.meta.url));
const destination = root + "apps/web/src/generated/";
await mkdir(destination, { recursive: true });
const context = vm.createContext({});
for (const file of [
  "questions",
  "practice-sets",
  "heygen-part3",
  "heygen-extra",
  "content-metadata",
])
  vm.runInContext(
    await readFile(root + "src/data/" + file + ".js", "utf8"),
    context,
  );
const data = vm.runInContext(
  "JSON.stringify({bank:BANK,scenes:SCENES,parts:PARTS,vocabulary:VOCAB,tests:PRACTICE_SETS,metadata:CONTENT_METADATA,recordings:[...HEYGEN_PART3_AUDIO.recordings,...HEYGEN_EXTRA_AUDIO.recordings]})",
  context,
);
await writeFile(destination + "learning.json", data + "\n");
for (const [name, exports] of [
  ["core", "default ToeicDomain"],
  ["daily-plan", "{createDailyPractice}"],
  ["activity", "{createActivityClock,activityDay,splitActivityDays}"],
  ["answer-queue", "{createAnswerQueue}"],
]) {
  let source = await readFile(root + "src/domain/" + name + ".js", "utf8");
  source = source.replace(/^if\(typeof module[^\n]*$/m, "");
  if (name === "daily-plan")
    source =
      "import ToeicDomain from './core.js';\n" +
      source.replace(
        "typeof ToeicDomain!=='undefined'?ToeicDomain:require('./core.js')",
        "ToeicDomain",
      );
  await writeFile(
    destination + name + ".js",
    source + "\nexport " + exports + ";\n",
  );
}
let repository = await readFile(root + "src/js/cloud-repository.js", "utf8");
await writeFile(
  destination + "repository.js",
  repository.replace(/^if\(typeof module[^\n]*$/m, "") +
    "\nexport {createCloudRepository,createProgressSync};\n",
);
await cp(root + "src/assets/audio", root + "apps/web/public/assets/audio", {
  recursive: true,
});
console.log(
  "Next content prepared: stable identities, shared domain rules and 102 recordings.",
);
