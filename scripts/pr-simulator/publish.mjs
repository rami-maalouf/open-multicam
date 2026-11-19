import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pullRequest, scenario } from "./scenario.mjs";

const begin = "<!-- simulator-evidence:begin -->";
const end = "<!-- simulator-evidence:end -->";

export function render(body, pr, assets, rawRoot) {
  const columns = ["before", "after"];
  const row = f => "| " + columns.map(f).join(" | ") + " |";
  const block = [
    begin, "### Recorded on Expo Simulators", "",
    "The same interaction ran against base `" + pr.base.sha + "` and head `" + pr.head.sha + "`.",
    "", "| Before | After |", "| --- | --- |",
    row(side => "![" + side + " screenshot](" + rawRoot + "/" + side + ".png)"),
    row(side => "![" + side + " interaction](" + rawRoot + "/" + side + ".gif)"),
    row(side => "[Full recording](" + assets[side].recording + ")"),
    row(side => "[Simulator session](https://expo.dev/accounts/ramimaalouf/projects/open-multicam/simulator-sessions/" + assets[side].session + ")"),
    end,
  ].join("\n");
  const start = body.indexOf(begin);
  const stop = body.indexOf(end);
  if (start === -1 && stop === -1) return body.trimEnd() + "\n\n" + block + "\n";
  if (start < 0 || stop < start || start !== body.lastIndexOf(begin) || stop !== body.lastIndexOf(end)) {
    throw new Error("invalid simulator evidence markers");
  }
  return body.slice(0, start) + block + body.slice(stop + end.length);
}

function publish() {
  const pr = pullRequest();
  const repo = process.env.GITHUB_REPOSITORY;
  const api = "repos/" + repo + "/pulls/" + pr.number;
  const path = ".agents/evidence/pr-" + pr.number;
  const run = (cmd, ...args) => execFileSync(cmd, args, { encoding: "utf8" }).trim();
  function currentBody() {
    const current = JSON.parse(run("gh", "api", api));
    if (current.state !== "open" || current.base.sha !== pr.base.sha || current.head.sha !== pr.head.sha ||
      JSON.stringify(scenario(current.body)) !== JSON.stringify(scenario(pr.body))) throw new Error("PR revisions or scenario changed");
    return current.body;
  }
  currentBody();
  const assets = {};
  for (const side of ["before", "after"]) {
    const asset = JSON.parse(readFileSync(path + "/" + side + ".json", "utf8"));
    if (!/^https:\/\/expo\.dev\/device-run-sessions\/artifacts\/[\w-]+$/.test(asset.recording) || !/^[\da-f-]{36}$/i.test(asset.session)) {
      throw new Error("invalid " + side + " artifact metadata");
    }
    assets[side] = asset;
    run("git", "add", "--", path + "/" + side + ".png", path + "/" + side + ".gif");
  }
  run("git", "-c", "user.name=github-actions[bot]", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
    "commit", "-m", "docs: record simulator evidence for pr " + pr.number);
  const media = run("git", "rev-parse", "HEAD");
  run("git", "push", "origin", "HEAD:refs/heads/evidence/pr-" + pr.number + "/" + process.env.GITHUB_RUN_ID + "-" + process.env.GITHUB_RUN_ATTEMPT);
  const root = "https://raw.githubusercontent.com/" + repo + "/" + media + "/" + path;
  const body = render(currentBody(), pr, assets, root);
  execFileSync("gh", ["api", "--method", "PATCH", api, "--input", "-", "--silent"], { input: JSON.stringify({ body }) });
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) publish();
