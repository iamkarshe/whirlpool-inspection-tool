import { defineConfig } from "orval";

export default defineConfig({
  inspectionTool: {
    input: {
      target: "./openapi.json",
      override: {
        transformer: "./orval.transformer.ts",
      },
    },
    output: {
      mode: "tags-split",
      target: "./src/api/generated/api.ts",
      schemas: "./src/api/generated/model",
      client: "axios",
      clean: true,
      override: {
        mutator: {
          path: "./src/api/axios-instance.ts",
          name: "customInstance",
        },
      },
    },
  },
});
