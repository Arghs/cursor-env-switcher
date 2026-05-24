import * as vscode from "vscode";
import {
  createSwitchPlan,
  detectEnvState,
  type EnvFileSet,
  type EnvMode,
  type RenameStep
} from "./envSwitcher";

const commandId = "envSwitcher.toggle";

export function activate(context: vscode.ExtensionContext): void {
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = commandId;
  statusBar.name = "Env Switcher";
  context.subscriptions.push(statusBar);

  const refreshStatus = async () => {
    await updateStatusBar(statusBar);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(commandId, async () => {
      await toggleEnvironment();
      await refreshStatus();
    })
  );

  const watcher = vscode.workspace.createFileSystemWatcher("**/.env*");
  context.subscriptions.push(
    watcher,
    watcher.onDidCreate(refreshStatus),
    watcher.onDidDelete(refreshStatus),
    watcher.onDidChange(refreshStatus)
  );

  void refreshStatus();
}

export function deactivate(): void {
  return;
}

async function updateStatusBar(statusBar: vscode.StatusBarItem): Promise<void> {
  const folder = getPrimaryWorkspaceFolder();
  if (!folder) {
    statusBar.text = "$(sync) Env: no workspace";
    statusBar.tooltip = "Open a workspace folder to switch .env files.";
    statusBar.show();
    return;
  }

  const state = detectEnvState(await readEnvFileSet(folder.uri));
  if (state.kind === "blocked") {
    statusBar.text = "$(warning) Env: unavailable";
    statusBar.tooltip = state.reason;
    statusBar.show();
    return;
  }

  statusBar.text = `$(sync) Env: ${state.mode}`;
  statusBar.tooltip = `Click to switch to ${oppositeMode(state.mode)}.`;
  statusBar.show();
}

async function toggleEnvironment(): Promise<void> {
  const folder = getPrimaryWorkspaceFolder();
  if (!folder) {
    void vscode.window.showErrorMessage("Open a workspace folder before switching .env files.");
    return;
  }

  const state = detectEnvState(await readEnvFileSet(folder.uri));
  if (state.kind === "blocked") {
    void vscode.window.showErrorMessage(state.reason);
    return;
  }

  const tempFileName = `.env.switcher.${Date.now()}.tmp`;
  const plan = createSwitchPlan(state.inactiveFile, state.activeBackupFile, tempFileName);

  try {
    await executeRenamePlan(folder.uri, plan);
    void vscode.window.showInformationMessage(`Switched active .env to ${oppositeMode(state.mode)}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`Failed to switch .env files: ${message}`);
  }
}

function getPrimaryWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.[0];
}

async function readEnvFileSet(folderUri: vscode.Uri): Promise<EnvFileSet> {
  const [hasEnv, hasDev, hasDevelopment, hasProd, hasProduction] = await Promise.all([
    fileExists(vscode.Uri.joinPath(folderUri, ".env")),
    fileExists(vscode.Uri.joinPath(folderUri, ".env.dev")),
    fileExists(vscode.Uri.joinPath(folderUri, ".env.development")),
    fileExists(vscode.Uri.joinPath(folderUri, ".env.prod")),
    fileExists(vscode.Uri.joinPath(folderUri, ".env.production"))
  ]);

  return {
    hasEnv,
    hasDev,
    hasDevelopment,
    hasProd,
    hasProduction
  };
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

async function executeRenamePlan(folderUri: vscode.Uri, plan: RenameStep[]): Promise<void> {
  for (const step of plan) {
    await vscode.workspace.fs.rename(
      vscode.Uri.joinPath(folderUri, step.from),
      vscode.Uri.joinPath(folderUri, step.to),
      {
        overwrite: false
      }
    );
  }
}

function oppositeMode(mode: EnvMode): EnvMode {
  return mode === "dev" ? "prod" : "dev";
}
