import assert from "node:assert/strict";
import {
  createSwitchPlan,
  detectEnvState,
  type EnvFileSet
} from "./envSwitcher";

function files(paths: string[]): EnvFileSet {
  return {
    hasEnv: paths.includes(".env"),
    hasDev: paths.includes(".env.dev"),
    hasDevelopment: paths.includes(".env.development"),
    hasProd: paths.includes(".env.prod"),
    hasProduction: paths.includes(".env.production")
  };
}

describe("env switcher", () => {
  it("detects dev when .env and .env.prod exist", () => {
    assert.deepEqual(detectEnvState(files([".env", ".env.prod"])), {
      kind: "active",
      mode: "dev",
      inactiveFile: ".env.prod",
      activeBackupFile: ".env.dev"
    });
  });

  it("detects dev when .env and .env.production exist", () => {
    assert.deepEqual(detectEnvState(files([".env", ".env.production"])), {
      kind: "active",
      mode: "dev",
      inactiveFile: ".env.production",
      activeBackupFile: ".env.development"
    });
  });

  it("detects prod when .env and .env.dev exist", () => {
    assert.deepEqual(detectEnvState(files([".env", ".env.dev"])), {
      kind: "active",
      mode: "prod",
      inactiveFile: ".env.dev",
      activeBackupFile: ".env.prod"
    });
  });

  it("detects prod when .env and .env.development exist", () => {
    assert.deepEqual(detectEnvState(files([".env", ".env.development"])), {
      kind: "active",
      mode: "prod",
      inactiveFile: ".env.development",
      activeBackupFile: ".env.production"
    });
  });

  it("blocks when the active .env file is missing", () => {
    assert.deepEqual(detectEnvState(files([".env.prod"])), {
      kind: "blocked",
      reason: "No active .env file found in the workspace."
    });
  });

  it("blocks when both inactive env files exist", () => {
    assert.deepEqual(detectEnvState(files([".env", ".env.dev", ".env.prod"])), {
      kind: "blocked",
      reason: "Both development and production backup env files exist, so the active .env mode is ambiguous."
    });
  });

  it("blocks when duplicate production aliases exist", () => {
    assert.deepEqual(detectEnvState(files([".env", ".env.prod", ".env.production"])), {
      kind: "blocked",
      reason: "Found multiple production backup env files: .env.prod, .env.production."
    });
  });

  it("plans a switch from dev to prod through a temp file", () => {
    assert.deepEqual(createSwitchPlan(".env.prod", ".env.dev", "env-switcher-temp"), [
      { from: ".env", to: "env-switcher-temp" },
      { from: ".env.prod", to: ".env" },
      { from: "env-switcher-temp", to: ".env.dev" }
    ]);
  });

  it("plans a switch from prod to dev through a temp file", () => {
    assert.deepEqual(createSwitchPlan(".env.dev", ".env.prod", "env-switcher-temp"), [
      { from: ".env", to: "env-switcher-temp" },
      { from: ".env.dev", to: ".env" },
      { from: "env-switcher-temp", to: ".env.prod" }
    ]);
  });

  it("plans a switch using long env aliases", () => {
    assert.deepEqual(createSwitchPlan(".env.production", ".env.development", "env-switcher-temp"), [
      { from: ".env", to: "env-switcher-temp" },
      { from: ".env.production", to: ".env" },
      { from: "env-switcher-temp", to: ".env.development" }
    ]);
  });
});
