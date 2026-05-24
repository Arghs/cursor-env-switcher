export type EnvMode = "dev" | "prod";

export interface EnvFileSet {
  hasEnv: boolean;
  hasDev: boolean;
  hasDevelopment: boolean;
  hasProd: boolean;
  hasProduction: boolean;
}

export type EnvState =
  | {
      kind: "active";
      mode: EnvMode;
      inactiveFile: string;
      activeBackupFile: string;
    }
  | {
      kind: "blocked";
      reason: string;
    };

export interface RenameStep {
  from: string;
  to: string;
}

export function detectEnvState(files: EnvFileSet): EnvState {
  if (!files.hasEnv) {
    return {
      kind: "blocked",
      reason: "No active .env file found in the workspace."
    };
  }

  const developmentBackups = collectExisting([
    [".env.dev", files.hasDev],
    [".env.development", files.hasDevelopment]
  ]);
  const productionBackups = collectExisting([
    [".env.prod", files.hasProd],
    [".env.production", files.hasProduction]
  ]);

  if (developmentBackups.length > 1) {
    return {
      kind: "blocked",
      reason: `Found multiple development backup env files: ${developmentBackups.join(", ")}.`
    };
  }

  if (productionBackups.length > 1) {
    return {
      kind: "blocked",
      reason: `Found multiple production backup env files: ${productionBackups.join(", ")}.`
    };
  }

  if (developmentBackups.length === 1 && productionBackups.length === 1) {
    return {
      kind: "blocked",
      reason: "Both development and production backup env files exist, so the active .env mode is ambiguous."
    };
  }

  if (productionBackups.length === 1) {
    const inactiveFile = productionBackups[0];
    return {
      kind: "active",
      mode: "dev",
      inactiveFile,
      activeBackupFile: inactiveFile === ".env.production" ? ".env.development" : ".env.dev"
    };
  }

  if (developmentBackups.length === 1) {
    const inactiveFile = developmentBackups[0];
    return {
      kind: "active",
      mode: "prod",
      inactiveFile,
      activeBackupFile: inactiveFile === ".env.development" ? ".env.production" : ".env.prod"
    };
  }

  return {
    kind: "blocked",
    reason: "Expected .env.dev, .env.development, .env.prod, or .env.production next to .env before switching."
  };
}

export function createSwitchPlan(
  inactiveFile: string,
  activeBackupFile: string,
  tempFileName: string
): RenameStep[] {
  return [
    { from: ".env", to: tempFileName },
    { from: inactiveFile, to: ".env" },
    { from: tempFileName, to: activeBackupFile }
  ];
}

function collectExisting(candidates: Array<[string, boolean]>): string[] {
  return candidates.flatMap(([fileName, exists]) => (exists ? [fileName] : []));
}
