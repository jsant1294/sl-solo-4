import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards the new operator/profiles pages against the same class of RSC
 * streaming leak found (and fixed) on other operator pages: a parent
 * layout's redirect() does not reliably stop a child page's own Server
 * Component from executing and being streamed into the response, so each
 * page that reads protected data must call requireOperator() itself,
 * before any repo/data access — not rely on operator/layout.tsx alone.
 */

const PAGES = [
  "src/app/operator/profiles/page.tsx",
  "src/app/operator/profiles/new/page.tsx",
];

function bodyOnly(source: string): string {
  return source.split("\n").filter((line) => !line.trim().startsWith("import ")).join("\n");
}

describe("operator/profiles pages auth boundary", () => {
  for (const relative of PAGES) {
    it(`${relative} calls requireOperator() before any repo/data access (if any)`, () => {
      const body = bodyOnly(readFileSync(join(process.cwd(), relative), "utf8"));
      const protectedCallMatch = body.match(/\b(repo|data)\s*\.\s*\w/);
      const requireOperatorMatch = body.match(/\brequireOperator\s*\(/);
      expect(requireOperatorMatch, `${relative} never calls requireOperator()`).not.toBeNull();
      if (protectedCallMatch) {
        expect(requireOperatorMatch!.index!).toBeLessThan(protectedCallMatch.index!);
      }
    });
  }

  it("the create action calls requireOperator() before any repo access", () => {
    const source = readFileSync(join(process.cwd(), "src/app/operator/profiles/actions.ts"), "utf8");
    const requireIndex = source.indexOf("await requireOperator()");
    const repoIndex = source.indexOf("repo.profiles.");
    expect(requireIndex).toBeGreaterThan(-1);
    expect(repoIndex).toBeGreaterThan(-1);
    expect(requireIndex).toBeLessThan(repoIndex);
  });
});
