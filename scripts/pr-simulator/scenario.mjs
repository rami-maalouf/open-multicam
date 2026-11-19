import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

export function scenario(body) {
  const blocks = [...body.matchAll(/^```simulator-scenario\r?\n([\s\S]*?)^```\s*$/gm)];
  assert.equal(blocks.length, 1, "include exactly one simulator-scenario block in the PR");
  const plan = JSON.parse(blocks[0][1]);
  assert.equal(typeof plan.camera, "boolean", "set camera to true or false");
  assert.ok(Array.isArray(plan.steps) && plan.steps.length > 0 && plan.steps.length <= 12, "supply 1 to 12 steps");
  for (const step of plan.steps) {
    assert.ok(["tap", "pan"].includes(step.action), "choose tap or pan");
    assert.ok(typeof step.label === "string" && step.label.length > 0 && step.label.length <= 200);
    if (step.action === "pan") {
      if (step.startY !== undefined) assert.ok(Number.isFinite(step.startY) && step.startY >= 0 && step.startY <= 1);
      for (const delta of [step.dx, step.dy]) assert.ok(Number.isInteger(delta) && Math.abs(delta) <= 1000);
      assert.ok(Number.isInteger(step.durationMs) && step.durationMs >= 100 && step.durationMs <= 5000);
    }
  }
  return plan;
}

export function pullRequest() {
  return JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")).pull_request;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) scenario(pullRequest().body ?? "");
