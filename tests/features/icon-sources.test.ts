import { androidIconSource, iconNames, type IconName } from "@/components/icon-sources";

// a name missing from the android map is a typecheck error, because Icon only accepts IconName
describe("android icons", () => {
  it("draws every mapped name as its own svg", () => {
    for (const name of iconNames) {
      expect(androidIconSource(name)).toMatch(/^data:image\/svg\+xml;base64,/);
    }
  });

  it("gives each library take kind its own glyph", () => {
    const libraryIcons: readonly IconName[] = [
      "rectangle.split.2x1.fill",
      "rectangle.inset.filled",
      "rectangle.split.1x2.fill",
      "video.fill",
    ];
    const glyphs = libraryIcons.map(androidIconSource);
    expect(new Set(glyphs).size).toBe(libraryIcons.length);
    expect(glyphs).not.toContain(androidIconSource("camera.fill"));
  });
});
