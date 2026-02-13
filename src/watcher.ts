import * as vscode from 'vscode';

/**
 * Manages file system watching for a project with debouncing.
 */
export class FileWatcher {
  private watcher: vscode.FileSystemWatcher | undefined;
  private debounceTimer: NodeJS.Timeout | undefined;
  private readonly debounceDelay = 250; // milliseconds
  private readonly excludePattern = '**/.project-explorer-links.json';

  /**
   * Creates a new FileWatcher instance.
   * @param projectPath Path to the project to watch
   * @param onChanged Callback to invoke when changes are detected
   */
  constructor(
    private projectPath: string,
    private onChanged: () => void
  ) {}

  /**
   * Start watching the project directory for changes.
   */
  start(): void {
    if (this.watcher) {
      return; // Already watching
    }

    try {
      // Create a pattern that matches everything except the config file
      const pattern = new vscode.RelativePattern(this.projectPath, '**/*');
      this.watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);

      // Subscribe to file system events with debouncing
      this.watcher.onDidCreate(() => this.debounceRefresh());
      this.watcher.onDidChange(() => this.debounceRefresh());
      this.watcher.onDidDelete(() => this.debounceRefresh());

      console.log(`[FileWatcher] Started watching: ${this.projectPath}`);
    } catch (error) {
      console.error(`[FileWatcher] Failed to start watching: ${error}`);
    }
  }

  /**
   * Stop watching and clean up resources.
   */
  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = undefined;
    }

    console.log(`[FileWatcher] Stopped watching: ${this.projectPath}`);
  }

  /**
   * Debounce file changes to avoid excessive refresh calls.
   */
  private debounceRefresh(): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      this.onChanged();
    }, this.debounceDelay);
  }
}
