// builds the site into dist/: bun bundles the page, its css and script (hashed names), splits the
// 3d scene into its own file, and we add what lives at fixed addresses.
import { cp, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
const result = await Bun.build({
  entrypoints: ["./src/index.html"],
  outdir: "./dist",
  minify: true,
  splitting: true,
  sourcemap: "none",
  // the fonts and the camera feeds are copied from src/public with their names
  external: ["/fonts/*", "/media/*"],
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
await cp("./src/public", "./dist", { recursive: true });
await cp("./src/img/share.jpg", "./dist/share.jpg");
await cp("./src/vercel.json", "./dist/vercel.json");

// preload the two text faces, which bun would otherwise try to bundle from the html
const preload = ["sora-latin-wght-normal", "geist-latin-wght-normal"]
  .map((f) => `<link rel="preload" href="/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`)
  .join("");
const page = await Bun.file("./dist/index.html").text();
await Bun.write("./dist/index.html", page.replace("<head>", `<head>${preload}`));
for (const o of result.outputs) console.log(`${(o.size / 1024).toFixed(1).padStart(7)} KB  ${o.path.replace(process.cwd() + "/", "")}`);
