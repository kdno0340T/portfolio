import fs from "node:fs/promises";
import path from "node:path";

const folder = path.resolve("reference-capture/home-desktop");
const bundle = JSON.parse(await fs.readFile(path.join(folder, "rea-evidence-bundle.json"), "utf8"));
const record = bundle.records.find((item) => item.evidence_id === "ev_77db95428d8f7adc4fd09f652468dc9a3035c4cf43976b8ea95731d12a67ae6b");
if (!record) throw new Error("Requested REA evidence record is absent from the exported bundle.");

for (const step of record.normalized_result.steps) {
  const name = step.step_id === "scenario_start" ? "preloader" : "load-home";
  const artifacts = step.artifacts;
  await fs.writeFile(path.join(folder, `${name}.png`), Buffer.from(artifacts.screenshot.value.data_base64, "base64"));
  await fs.writeFile(path.join(folder, `${name}.dom.html`), artifacts.dom.value.text);
  await fs.writeFile(path.join(folder, `${name}.accessibility.txt`), artifacts.accessibility.value.text);
}
