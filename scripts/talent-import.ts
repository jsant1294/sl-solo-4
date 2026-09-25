import { readFileSync, writeFileSync } from "node:fs";
import { dryRunTalentImport, type ImportInventory } from "../src/lib/talent/import";
const [sourcePath, reportPath, inventoryPath] = process.argv.slice(2);
if (!sourcePath || !reportPath) throw new Error("Usage: npx tsx scripts/talent-import.ts source.json report.json [inventory.json]");
const input = JSON.parse(readFileSync(sourcePath, "utf8"));
const inventory: ImportInventory = inventoryPath ? JSON.parse(readFileSync(inventoryPath, "utf8")) : { slugs: [] };
const reports = (Array.isArray(input) ? input : [input]).map(row => {
  const report = dryRunTalentImport(row, inventory);
  inventory.slugs.push(report.proposedSlug);
  return report;
});
// Never overwrite a source or existing report; the report may contain private source contact data.
writeFileSync(reportPath, JSON.stringify(reports, null, 2) + "\n", { flag: "wx", mode: 0o600 });
console.log(`Dry run: ${reports.length} profiles. Report written; no source records or destination profiles changed.`);
