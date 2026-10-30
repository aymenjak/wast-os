import type { Dictionary } from "./dictionaries/en";

/** Looks up a dotted key ("errors.workOrder.evidenceRequired" or "workOrder.evidenceRequired") and fills {placeholders}. */
export function translate(dict: Dictionary, key: string, vars?: Record<string, unknown>): string {
  const path = key.startsWith("errors.") || key.includes(".") ? key.split(".") : [key];
  let node: unknown = dict;
  for (const part of path) {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) node = (node as Record<string, unknown>)[part];
    else return key;
  }
  if (typeof node !== "string") return key;
  return vars ? node.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? `{${k}}` : String(vars[k]))) : node;
}
