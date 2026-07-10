import { describe, expect, it } from "vitest";

import { DEFAULT_NAMESPACE, GENERATOR_MODULE, GeneratorConfig } from "../src/config.js";

describe("GeneratorConfig", () => {
  it("uses the Laravel Data module ID and Skir default namespace", () => {
    expect(GENERATOR_MODULE).toBe("skir-laravel-data-generator");
    expect(DEFAULT_NAMESPACE).toBe("Skir");
    expect(GeneratorConfig.parse({})).toEqual({ namespace: "Skir" });
  });

  it("is strict and validates canonical ASCII PHP namespaces", () => {
    expect(GeneratorConfig.parse({ namespace: "Company\\Contracts" }))
      .toEqual({ namespace: "Company\\Contracts" });
    expect(GeneratorConfig.safeParse({ namespace: "Skir", unexpected: true }).success)
      .toBe(false);
    expect(GeneratorConfig.safeParse({ namespace: "Skir\\Módulo" }).success)
      .toBe(false);
  });
});
