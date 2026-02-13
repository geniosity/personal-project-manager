import * as vscode from 'vscode';
import { ProjectsStorage, IProject } from './storage';
import { LinksStorage } from './linksStorage';
import { StateManager } from './stateManager';
import { TreeModel } from './treeModel';
import { FileWatcher } from './watcher';
import { TreeDragDropController } from './dragDropController';

/**
 * Represents a single node in the project tree.
 */
class ProjectNode extends vscode.TreeItem {
  /**
   * Creates a new project node.
   * @param label The display label for this node
   * @param collapsibleState Whether the node can be expanded
   * @param contextValue Classification for context menu filtering
   * @param command Optional command to execute on click
   */
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    if (command) {
      this.command = command;
    }
  }
}

/**
 * Implements the TreeDataProvider for the project viewer.
 */
class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectNode | undefined> =
    new vscode.EventEmitter<ProjectNode | undefined>();
  readonly onDidChangeTreeData: vscode.Event<ProjectNode | undefined> =
    this._onDidChangeTreeData.event;

  constructor(
    private projectsStorage: ProjectsStorage,
    private linksStorage: LinksStorage,
    private stateManager: StateManager,
    private treeModel: TreeModel
  ) {}

  /**
   * Refresh the tree or a specific node.
   * @param node Optional node to refresh; if undefined, refreshes entire tree
   */
  refresh(node?: ProjectNode): void {
    this._onDidChangeTreeData.fire(node);
  }

  /**
   * Get TreeItem representation for a node.
   * @param element The node to represent
   * @returns The TreeItem for this node
   */
  getTreeItem(element: ProjectNode): vscode.TreeItem {
    return element;
  }

  /**
   * Get child nodes for a given node.
   * @param element Optional parent node; if undefined, returns root projects
   * @returns Promise resolving to array of child nodes
   */
  getChildren(element?: ProjectNode): Thenable<ProjectNode[]> {
    if (!element) {
      // Return root level - all projects
      const projects = this.projectsStorage.getProjects();
      return Promise.resolve(
        projects.map(
          project =>
            new ProjectNode(
              project.name,
              vscode.TreeItemCollapsibleState.Collapsed,
              'project'
            )
        )
      );
    }

    // Get children for a specific project
    return Promise.resolve([]);
  }
}

/**
 * Activation function for the extension.
 * @param context The extension context
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Personal Project Manager extension is now active!');

  // Initialize storage services
  const projectsStorage = new ProjectsStorage(context.globalStoragePath);
  const linksStorage = new LinksStorage();
  const stateManager = new StateManager(context);
  const treeModel = new TreeModel(linksStorage);

  // Track active watcher
  let activeWatcher: FileWatcher | undefined;

  // Create and register the tree provider
  const treeProvider = new ProjectTreeProvider(projectsStorage, linksStorage, stateManager, treeModel);
  const treeView = vscode.window.createTreeView('projectViewer', {
    treeDataProvider: treeProvider,
    dragAndDropController: new TreeDragDropController(async (draggedId, targetId) => {
      console.log(`Drag-drop: ${draggedId} -> ${targetId}`);
      vscode.window.showInformationMessage(`Drag and drop: ${draggedId} to ${targetId}`);
    })
  });

  // Register all commands with placeholder handlers
  const commands = [
    {
      id: 'projectviewer.createNewProject',
      handler: () => vscode.window.showInformationMessage('Create New Project')
    },
    {
      id: 'projectviewer.openProject',
      handler: async () => {
        // Get list of projects
        const projects = projectsStorage.getProjects();
        if (projects.length === 0) {
          vscode.window.showWarningMessage('No projects available. Create a new project first.');
          return;
        }

        // Show quick pick
        const selected = await vscode.window.showQuickPick(
          projects.map(p => ({ label: p.name, detail: p.rootPath })),
          { placeHolder: 'Select project to open' }
        );

        if (selected) {
          const project = projects.find(p => p.name === selected.label);
          if (project) {
            stateManager.setActiveProjectName(project.name);

            // Dispose old watcher
            if (activeWatcher) {
              activeWatcher.dispose();
            }

            // Create new watcher
            activeWatcher = new FileWatcher(project.rootPath, () => {
              console.log('[Watcher] Detected changes, refreshing tree');
              treeProvider.refresh();
            });
            activeWatcher.start();

            treeProvider.refresh();
            vscode.window.showInformationMessage(`Opened project: ${project.name}`);
          }
        }
      }
    },
    {
      id: 'projectviewer.closeProject',
      handler: () => {
        if (activeWatcher) {
          activeWatcher.dispose();
          activeWatcher = undefined;
        }

        stateManager.setActiveProjectName(undefined);
        treeProvider.refresh();
        vscode.window.showInformationMessage('Closed project');
      }
    },
    {
      id: 'projectviewer.refreshEntry',
      handler: () => {
        treeProvider.refresh();
        vscode.window.showInformationMessage('Refreshed project tree');
      }
    },
    {
      id: 'projectviewer.renameItem',
      handler: () => vscode.window.showInformationMessage('Rename Item')
    },
    {
      id: 'projectviewer.deleteItem',
      handler: () => vscode.window.showInformationMessage('Delete Item')
    },
    {
      id: 'projectviewer.addExternalLink',
      handler: () => vscode.window.showInformationMessage('Add External Link')
    },
    {
      id: 'projectviewer.removeLink',
      handler: () => vscode.window.showInformationMessage('Remove Link')
    },
    {
      id: 'projectviewer.copyPath',
      handler: () => vscode.window.showInformationMessage('Copy Path')
    },
    {
      id: 'projectviewer.copyRelativePath',
      handler: () => vscode.window.showInformationMessage('Copy Relative Path')
    },
    {
      id: 'projectviewer.openContainingFolder',
      handler: () => vscode.window.showInformationMessage('Open Containing Folder')
    }
  ];

  // Register each command
  commands.forEach(cmd => {
    const disposable = vscode.commands.registerCommand(cmd.id, cmd.handler);
    context.subscriptions.push(disposable);
  });

  // Register file operation commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'projectviewer.createDirectory',
      async (node: ProjectNode) => {
        const projectName = node.label;
        const project = projectsStorage.getProject(projectName);
        if (!project) {
          vscode.window.showErrorMessage(`Project not found: ${projectName}`);
          return;
        }

        const dirName = await vscode.window.showInputBox({
          prompt: 'Enter directory name',
          validateInput: (value) => {
            if (!value.trim()) {
              return 'Directory name cannot be empty';
            }
            if (/[\/<>:"|?*]/.test(value)) {
              return 'Directory name contains invalid characters';
            }
            return undefined;
          }
        });

        if (!dirName) {
          return;
        }

        try {
          const fs = await import('fs');
          const path = await import('path');
          const newDirPath = path.join(project.rootPath, dirName);

          if (fs.existsSync(newDirPath)) {
            vscode.window.showErrorMessage(
              `Directory already exists: ${dirName}`
            );
            return;
          }

          fs.mkdirSync(newDirPath, { recursive: true });
          treeProvider.refresh();
          vscode.window.showInformationMessage(`Created directory: ${dirName}`);
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to create directory: ${error}`
          );
        }
      }
    )
  );

  // Register rename command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'projectviewer.renameItem',
      async (node: ProjectNode) => {
        const oldName = node.label;
        const newName = await vscode.window.showInputBox({
          prompt: 'Enter new name',
          value: oldName,
          validateInput: (value) => {
            if (!value.trim()) {
              return 'Name cannot be empty';
            }
            if (/[\/<>:"|?*]/.test(value)) {
              return 'Name contains invalid characters';
            }
            return undefined;
          }
        });

        if (!newName || newName === oldName) {
          return;
        }

        vscode.window.showInformationMessage(
          `Rename functionality to be implemented for: ${newName}`
        );
      }
    )
  );

  // Register delete command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'projectviewer.deleteItem',
      async (node: ProjectNode) => {
        const result = await vscode.window.showWarningMessage(
          `Delete "${node.label}"? This cannot be undone.`,
          { modal: true },
          'Delete'
        );

        if (result === 'Delete') {
          vscode.window.showInformationMessage(
            `Delete functionality to be implemented for: ${node.label}`
          );
        }
      }
    )
  );

  // Cleanup on extension deactivation
  context.subscriptions.push({
    dispose: () => {
      if (activeWatcher) {
        activeWatcher.dispose();
        activeWatcher = undefined;
      }
    }
  });

  // Add tree view to subscriptions
  context.subscriptions.push(treeView);
}

/**
 * Deactivation function for the extension.
 */
export function deactivate() {}
