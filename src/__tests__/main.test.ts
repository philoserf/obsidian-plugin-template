import { expect, test } from "bun:test";
import { greet } from "../utils";

test("greet function returns a greeting", () => {
  expect(greet("World")).toBe("Hello, World!");
  expect(greet("Obsidian")).toBe("Hello, Obsidian!");
});

test("greet function handles empty string", () => {
  expect(greet("")).toBe("Hello, !");
});
