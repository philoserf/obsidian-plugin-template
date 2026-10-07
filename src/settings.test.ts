import { expect, test } from "bun:test";
import type {
  SettingDefinition,
  SettingDefinitionGroup,
  SettingDefinitionItem,
} from "obsidian";
import type ExamplePlugin from "./main";
import { ExampleSettingTab } from "./main";

// The tab is data, so it is tested as data: no DOM and no Obsidian. The
// plugin is a stand-in; Obsidian runs the real lifecycle.
function definitions(): SettingDefinitionItem[] {
  const plugin = { settings: {}, greet() {} } as unknown as ExamplePlugin;
  return new ExampleSettingTab(
    {} as ExamplePlugin["app"],
    plugin,
  ).getSettingDefinitions();
}

function rows(): SettingDefinition[] {
  return definitions().flatMap(
    (item) =>
      ((item as SettingDefinitionGroup).items ?? []) as SettingDefinition[],
  );
}

function row(name: string): SettingDefinition {
  const found = rows().find((r) => r.name === name);
  if (!found) throw new Error(`no row named ${name}`);
  return found;
}

test("groups the rows under headings", () => {
  expect(
    definitions().map((g) => (g as SettingDefinitionGroup).heading),
  ).toEqual(["Greeting", "Credentials"]);
});

test("binds each control row to a settings key", () => {
  const bound = rows().flatMap((r) =>
    "control" in r && r.control ? [[r.control.key, r.control.type]] : [],
  );
  expect(bound).toEqual([
    ["name", "text"],
    ["greeting", "dropdown"],
    ["greetOnLoad", "toggle"],
  ]);
});

test("rejects an empty name and accepts any other", async () => {
  const r = row("Name");
  if (!("control" in r) || r.control?.type !== "text") throw new Error();
  const validate = r.control.validate;
  expect(await validate?.("  ")).toBe("Name cannot be empty.");
  expect(await validate?.("Ada")).toBeUndefined();
});

test("offers an action row", () => {
  expect("action" in row("Greet now")).toBe(true);
});

test("keeps the API key out of the auto-saved controls", () => {
  // A control row would write the value itself to data.json. The key row is
  // rendered with a SecretComponent instead, which stores only an ID.
  const r = row("API key");
  expect("render" in r).toBe(true);
  expect("control" in r).toBe(false);
});
