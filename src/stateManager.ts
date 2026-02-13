import * as vscode from 'vscode';

/**
 * Interface for state change event data.
 */
export interface IActiveProjectChangedEvent {
  /** Previous project name, or undefined if no project was active */
  oldProject: string | undefined;
  /** New project name, or undefined if no project is active */
  newProject: string | undefined;
}

/**
 * Manages extension state storage using VS Code workspace state.
 */
export class StateManager {
  private context: vscode.ExtensionContext;
  private readonly ACTIVE_PROJECT_KEY = 'projectviewer.activeProjectName';
  private readonly RECENT_PROJECTS_KEY = 'projectviewer.recentProjects';
  private readonly MAX_RECENT = 10;

  private _onDidChangeActiveProject = new vscode.EventEmitter<IActiveProjectChangedEvent>();
  readonly onDidChangeActiveProject = this._onDidChangeActiveProject.event;

  /**
   * Creates a new StateManager instance.
   * @param context The extension context
   */
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Get the currently active project name.
   * @returns Active project name, or undefined if no project is active
   */
  getActiveProjectName(): string | undefined {
    return this.context.workspaceState.get(this.ACTIVE_PROJECT_KEY);
  }

  /**
   * Set the active project name.
   * @param projectName Project name to set as active, or undefined to clear
   */
  setActiveProjectName(projectName: string | undefined): void {
    const oldProject = this.getActiveProjectName();

    this.context.workspaceState.update(this.ACTIVE_PROJECT_KEY, projectName);

    // Add to recent projects if setting a new active project
    if (projectName) {
      this.addRecentProject(projectName);
    }

    // Fire change event
    this._onDidChangeActiveProject.fire({
      oldProject,
      newProject: projectName
    });
  }

  /**
   * Get recent projects list.
   * @returns Array of recent project names, ordered most recent first
   */
  getRecentProjects(): string[] {
    const recent = this.context.workspaceState.get<string[]>(this.RECENT_PROJECTS_KEY);
    return recent || [];
  }

  /**
   * Add a project to the recent projects list.
   * @param projectName Project name to add
   */
  addRecentProject(projectName: string): void {
    let recent = this.getRecentProjects();

    // Remove if already in list (to avoid duplicates)
    recent = recent.filter(p => p !== projectName);

    // Add to front
    recent.unshift(projectName);

    // Trim to max recent size
    if (recent.length > this.MAX_RECENT) {
      recent = recent.slice(0, this.MAX_RECENT);
    }

    this.context.workspaceState.update(this.RECENT_PROJECTS_KEY, recent);
  }

  /**
   * Remove a project from recent projects list.
   * @param projectName Project name to remove
   */
  removeRecentProject(projectName: string): void {
    let recent = this.getRecentProjects();
    recent = recent.filter(p => p !== projectName);
    this.context.workspaceState.update(this.RECENT_PROJECTS_KEY, recent);
  }

  /**
   * Clear all recent projects.
   */
  clearRecentProjects(): void {
    this.context.workspaceState.update(this.RECENT_PROJECTS_KEY, []);
  }
}
