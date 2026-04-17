import { describe, expect, test } from "bun:test";
import ExamplePlugin from "./main";

describe("ExamplePlugin", () => {
  test("initializes with empty default settings", () => {
    const plugin = new (ExamplePlugin as new () => ExamplePlugin)();
    expect(plugin.settings).toEqual({});
  });
});
