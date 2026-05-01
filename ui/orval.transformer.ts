import { defineTransformer } from "orval";

/**
 * Drops Default-tag operations (Orval emits broken empty `getDefault()` otherwise)
 * and untagged `/health` + `/version` used only for infra probes.
 */
export default defineTransformer((spec) => {
  if (!spec.paths) return spec;

  const paths = { ...spec.paths };
  for (const key of ["/health", "/version"]) {
    delete paths[key];
  }

  const verbs = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "options",
    "head",
  ] as const;

  for (const pathKey of Object.keys(paths)) {
    const pathItem = paths[pathKey];
    if (!pathItem || typeof pathItem !== "object") continue;

    const next: Record<string, unknown> = { ...pathItem };
    for (const verb of verbs) {
      const operation = (
        pathItem as Record<string, unknown>
      )[verb] as { tags?: string[] } | undefined;
      if (operation?.tags?.includes("Default")) {
        delete next[verb];
      }
    }

    const hasVerb = verbs.some((v) => v in next);

    if (hasVerb) {
      paths[pathKey] = next as (typeof paths)[string];
    } else {
      delete paths[pathKey];
    }
  }

  return { ...spec, paths };
});
