import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ProjectsStorage, IProject } from './storage';
import { LinksStorage } from './linksStorage';
import { StateManager } from './stateManager';
import { TreeModel, NodeModel } from './treeModel';
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
    public readonly id: string,
    public readonly itemPath: string,
    command?: vscode.Command,
    public readonly linkId?: string
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    if (command) {
      this.command = command;
    }
  }
}

function extractLinkId(node: NodeModel): string | undefined {
  if (node.id.startsWith('manualDir:')) {
    return node.id.slice('manualDir:'.length);
  }
  if (node.id.startsWith('manualFile:')) {
    return node.id.slice('manualFile:'.length);
  }
  if (node.id.startsWith('brokenLink:')) {
    return node.id.slice('brokenLink:'.length);
  }
  return undefined;
}

function convertNodeToTreeItem(node: NodeModel): ProjectNode {
  const isFile = node.contextValue === 'physicalFile' || node.contextValue === 'manualFile';
  const isFolder = node.contextValue === 'physicalDir' || node.contextValue === 'manualDir';
  const isBroken = node.contextValue === 'brokenLink';
  const isExternal = node.contextValue === 'manualFile' || node.contextValue === 'manualDir';
  const collapsibleState = node.collapsible
    ? vscode.TreeItemCollapsibleState.Collapsed
    : vscode.TreeItemCollapsibleState.None;

  const command = isFile && !isBroken
    ? {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [vscode.Uri.file(node.itemPath), { preview: false }]
      }
    : undefined;

  // Add arrow prefix for external items
  const displayLabel = isExternal ? `→ ${node.label}` : node.label;

  const treeItem = new ProjectNode(
    displayLabel,
    collapsibleState,
    node.contextValue,
    node.id,
    node.itemPath,
    command,
    extractLinkId(node)
  );

  if ((isFile || isFolder) && !isBroken) {
    treeItem.resourceUri = vscode.Uri.file(node.itemPath);
  }

  if (isExternal) {
    treeItem.description = '(external)';
  }

  if (isBroken) {
    treeItem.iconPath = new vscode.ThemeIcon('warning');
  }

  if (node.contextValue === 'projectsContainer') {
    treeItem.iconPath = new vscode.ThemeIcon('briefcase');
  }

  treeItem.tooltip = isBroken ? `${node.itemPath} (missing)` : node.itemPath;

  return treeItem;
}

/**
 * Implements the TreeDataProvider for the project viewer.
 */
export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectNode> {
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
   * Get parent node for a given element.
   * Required for TreeView.reveal support.
   * @param element The node to find a parent for
   * @returns Parent node, or undefined if at root
   */
  getParent(element: ProjectNode): ProjectNode | undefined {
    if (element.contextValue === 'projectsContainer') {
      return undefined;
    }

    if (element.contextValue === 'project') {
      const activeProjectName = this.stateManager.getActiveProjectName();
      if (activeProjectName && element.label !== activeProjectName) {
        return this.createProjectsContainerNode();
      }
      return undefined;
    }

    const activeProject = this.getActiveProject();
    if (!activeProject) {
      return undefined;
    }

    const projectModel = this.treeModel.createProjectModel(
      activeProject.name,
      activeProject.rootPath
    );

    const parentNode = this.findParentNode(projectModel, element.id);
    if (!parentNode) {
      return undefined;
    }

    if (parentNode.contextValue === 'project') {
      const parentProjectNode = new ProjectNode(
        parentNode.label,
        vscode.TreeItemCollapsibleState.Collapsed,
        'project',
        parentNode.id,
        parentNode.itemPath
      );
      parentProjectNode.resourceUri = vscode.Uri.file(parentNode.itemPath);
      return parentProjectNode;
    }

    return convertNodeToTreeItem(parentNode);
  }

  /**
   * Get child nodes for a given node.
   * @param element Optional parent node; if undefined, returns root projects
   * @returns Promise resolving to array of child nodes
   */
  getChildren(element?: ProjectNode): Thenable<ProjectNode[]> {
    if (!element) {
      const projects = this.projectsStorage.getProjects();
      const activeProjectName = this.stateManager.getActiveProjectName();

      if (activeProjectName) {
        const result: ProjectNode[] = [];
        const inactiveProjects = projects.filter(p => p.name !== activeProjectName);
        if (inactiveProjects.length > 0) {
          result.push(this.createProjectsContainerNode());
        }
        const activeProject = projects.find(p => p.name === activeProjectName);
        if (activeProject) {
          result.push(this.createProjectNode(activeProject, true));
        }
        return Promise.resolve(result);
      }

      return Promise.resolve(projects.map(project => this.createProjectNode(project, false)));
    }

    // Handle Projects container
    if (element.contextValue === 'projectsContainer') {
      const projects = this.projectsStorage.getProjects();
      const activeProjectName = this.stateManager.getActiveProjectName();
      return Promise.resolve(
        projects
          .filter(p => p.name !== activeProjectName)
          .map(project => this.createProjectNode(project, false))
      );
    }

    if (element.contextValue === 'project') {
      const activeProjectName = this.stateManager.getActiveProjectName();
      if (element.label !== activeProjectName) {
        return Promise.resolve([]);
      }

      const project = this.projectsStorage.getProject(element.label);
      if (!project) {
        return Promise.resolve([]);
      }

      const projectModel = this.treeModel.createProjectModel(
        project.name,
        project.rootPath
      );

      return Promise.resolve(
        this.treeModel.getChildren(projectModel).map(convertNodeToTreeItem)
      );
    }

    const activeProject = this.getActiveProject();
    if (!activeProject) {
      return Promise.resolve([]);
    }

    const model = this.treeModel.nodeForElement(
      { contextValue: element.contextValue, itemPath: element.itemPath, linkId: element.linkId },
      activeProject.rootPath
    );
    if (!model) {
      return Promise.resolve([]);
    }

    return Promise.resolve(model.getChildren().map(convertNodeToTreeItem));
  }

  private getActiveProject(): IProject | undefined {
    const activeProjectName = this.stateManager.getActiveProjectName();
    if (!activeProjectName) {
      return undefined;
    }
    return this.projectsStorage.getProject(activeProjectName);
  }

  private createProjectsContainerNode(): ProjectNode {
    return new ProjectNode(
      'All Projects',
      vscode.TreeItemCollapsibleState.Collapsed,
      'projectsContainer',
      'projectsContainer',
      ''
    );
  }

  private createProjectNode(project: IProject, isActive: boolean): ProjectNode {
    const rootExists = fs.existsSync(project.rootPath);
    const node = new ProjectNode(
      project.name,
      isActive ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
      'project',
      `project:${project.name}`,
      project.rootPath,
      { command: 'projectviewer.activateProject', title: 'Open Project', arguments: [project.name] }
    );
    node.resourceUri = vscode.Uri.file(project.rootPath);
    node.tooltip = project.description
      ? `${project.description}\n${project.rootPath}`
      : project.rootPath;
    if (isActive) {
      node.description = 'active';
    }
    if (!rootExists) {
      node.iconPath = new vscode.ThemeIcon('warning');
      node.description = 'missing';
      node.tooltip = `Project root not found:\n${project.rootPath}`;
    }
    return node;
  }

  private findParentNode(node: NodeModel, childId: string, seen = new Set<string>()): NodeModel | undefined {
    if (seen.has(node.id)) {
      return undefined;
    }
    seen.add(node.id);

    for (const child of node.getChildren()) {
      if (child.id === childId) {
        return node;
      }
      const found = this.findParentNode(child, childId, seen);
      if (found) {
        return found;
      }
    }

    return undefined;
  }
}

/**
 * Activation function for the extension.
 * @param context The extension context
 */
export function activate(context: vscode.ExtensionContext) {
  // Initialize storage services
  const projectsStorage = new ProjectsStorage(context.globalStorageUri.fsPath);
  const linksStorage = new LinksStorage();
  const stateManager = new StateManager(context);
  const treeModel = new TreeModel(linksStorage);
  const outputChannel = vscode.window.createOutputChannel('Personal Project Manager');
  context.subscriptions.push(outputChannel);

  // Track active watcher
  let activeWatcher: FileWatcher | undefined;

  const activateProject = (project: IProject) => {
    if (stateManager.getActiveProjectName() === project.name && activeWatcher) {
      return; // already active — clicking to expand should not recreate the watcher
    }

    stateManager.setActiveProjectName(project.name);

    if (activeWatcher) {
      activeWatcher.dispose();
    }

    activeWatcher = new FileWatcher(project.rootPath, () => {
      treeProvider.refresh();
    });
    activeWatcher.start();
    treeProvider.refresh();
  };

  const getProjectByName = (projectName: string): IProject | undefined =>
    projectsStorage.getProject(projectName);

  const pathExists = async (fsPath: string): Promise<boolean> => {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(fsPath));
      return true;
    } catch {
      return false;
    }
  };

  const getTargetDirectory = (node?: ProjectNode): string | undefined => {
    if (!node) {
      return undefined;
    }

    if (node.contextValue === 'project') {
      return node.itemPath;
    }

    if (node.contextValue === 'physicalDir' || node.contextValue === 'manualDir') {
      return node.itemPath;
    }

    return undefined;
  };

  const countEntries = async (uri: vscode.Uri): Promise<number> => {
    const entries = await vscode.workspace.fs.readDirectory(uri);
    let count = entries.length;
    for (const [name, type] of entries) {
      if (type === vscode.FileType.Directory) {
        count += await countEntries(vscode.Uri.joinPath(uri, name));
      }
    }
    return count;
  };

  const isRevealActiveFileEnabled = (): boolean =>
    vscode.workspace.getConfiguration('projectviewer').get<boolean>('enableRevealActiveFile', false);

  const shouldLogRevealActiveFile = (): boolean =>
    vscode.workspace.getConfiguration('projectviewer').get<boolean>('revealActiveFileLogging', false);

  const logRevealActiveFile = (message: string): void => {
    if (shouldLogRevealActiveFile()) {
      outputChannel.appendLine(`[RevealActiveFile] ${message}`);
    }
  };

  const toggleRevealActiveFileFeature = async (): Promise<void> => {
    const config = vscode.workspace.getConfiguration('projectviewer');
    const isEnabled = config.get<boolean>('enableRevealActiveFile', false);
    await config.update('enableRevealActiveFile', !isEnabled, vscode.ConfigurationTarget.Global);
    const newState = !isEnabled ? 'enabled' : 'disabled';
    vscode.window.showInformationMessage(`Reveal Active File is now ${newState}.`);
  };

  // Register toggle command
  context.subscriptions.push(
    vscode.commands.registerCommand('projectviewer.toggleRevealActiveFile', toggleRevealActiveFileFeature)
  );

  // Create and register the tree provider
  const treeProvider = new ProjectTreeProvider(projectsStorage, linksStorage, stateManager, treeModel);
  const treeView = vscode.window.createTreeView('projectViewer', {
    treeDataProvider: treeProvider,
    dragAndDropController: new TreeDragDropController(
      projectsStorage,
      linksStorage,
      stateManager,
      () => treeProvider.refresh()
    )
  });

  // Activate a project explicitly via command (bound to each project row's click
  // command). Selection no longer triggers activation, so right-clicking an
  // inactive project to use a context action does not silently switch the active
  // project.
  context.subscriptions.push(
    vscode.commands.registerCommand('projectviewer.activateProject', (projectName: string) => {
      const project = getProjectByName(projectName);
      if (project) {
        activateProject(project);
      }
    })
  );

  // Register all commands with placeholder handlers
  const commands = [
    {
      id: 'projectviewer.createNewProject',
      handler: async () => {
        const selection = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: 'Select Project Root'
        });

        if (!selection || selection.length === 0) {
          return;
        }

        const rootPath = selection[0].fsPath;
        const existingProjects = projectsStorage.getProjects();
        const defaultName = path.basename(rootPath);

        const projectName = await vscode.window.showInputBox({
          prompt: 'Enter project name',
          value: defaultName,
          validateInput: (value) => {
            const trimmed = value.trim();
            if (!trimmed) {
              return 'Project name cannot be empty';
            }
            if (/[\\/]/.test(trimmed)) {
              return 'Project name cannot contain path separators';
            }
            if (existingProjects.some(project => project.name === trimmed)) {
              return `Project name "${trimmed}" already exists`;
            }
            return undefined;
          }
        });

        if (!projectName) {
          return;
        }

        try {
          projectsStorage.addProject(projectName.trim(), rootPath);
          const project = getProjectByName(projectName.trim());
          if (!project) {
            vscode.window.showErrorMessage('Project was created but could not be loaded.');
            return;
          }
          activateProject(project);
          vscode.window.showInformationMessage(`Created and opened project: ${project.name}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to create project: ${error}`);
        }
      }
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

        if (!selected) {
          return;
        }

        const project = projects.find(p => p.name === selected.label);
        if (!project) {
          return;
        }

        activateProject(project);
        vscode.window.showInformationMessage(`Opened project: ${project.name}`);
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
      id: 'projectviewer.renameProject',
      handler: async (node?: ProjectNode) => {
        const projectName = node?.label ?? stateManager.getActiveProjectName();
        if (!projectName) {
          vscode.window.showWarningMessage('No project selected to rename.');
          return;
        }

        const project = getProjectByName(projectName);
        if (!project) {
          vscode.window.showErrorMessage(`Project not found: ${projectName}`);
          return;
        }

        const existingProjects = projectsStorage.getProjects();
        const newName = await vscode.window.showInputBox({
          prompt: 'Enter new project name',
          value: project.name,
          validateInput: (value) => {
            const trimmed = value.trim();
            if (!trimmed) {
              return 'Project name cannot be empty';
            }
            if (/[\\/]/.test(trimmed)) {
              return 'Project name cannot contain path separators';
            }
            if (
              trimmed !== project.name &&
              existingProjects.some(existing => existing.name === trimmed)
            ) {
              return `Project name "${trimmed}" already exists`;
            }
            return undefined;
          }
        });

        if (!newName || newName === project.name) {
          return;
        }

        try {
          projectsStorage.renameProject(project.name, newName.trim());
          if (stateManager.getActiveProjectName() === project.name) {
            stateManager.setActiveProjectName(newName.trim());
          }
          treeProvider.refresh();
          vscode.window.showInformationMessage(`Renamed project to: ${newName.trim()}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to rename project: ${error}`);
        }
      }
    },
    {
      id: 'projectviewer.deleteProject',
      handler: async (node?: ProjectNode) => {
        const projectName = node?.label ?? stateManager.getActiveProjectName();
        if (!projectName) {
          vscode.window.showWarningMessage('No project selected to delete.');
          return;
        }

        const project = getProjectByName(projectName);
        if (!project) {
          vscode.window.showErrorMessage(`Project not found: ${projectName}`);
          return;
        }

        const confirmed = await vscode.window.showWarningMessage(
          `Delete project "${project.name}"? This will not delete files from disk.`,
          { modal: true },
          'Delete'
        );

        if (confirmed !== 'Delete') {
          return;
        }

        try {
          projectsStorage.removeProject(project.name);
          const linksPath = path.join(project.rootPath, '.project-explorer-links.json');
          try {
            await vscode.workspace.fs.delete(vscode.Uri.file(linksPath), { useTrash: true });
          } catch {
            // Ignore missing links file
          }

          if (stateManager.getActiveProjectName() === project.name) {
            if (activeWatcher) {
              activeWatcher.dispose();
              activeWatcher = undefined;
            }
            stateManager.setActiveProjectName(undefined);
          }

          treeProvider.refresh();
          vscode.window.showInformationMessage(`Deleted project: ${project.name}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to delete project: ${error}`);
        }
      }
    },
    {
      id: 'projectviewer.cleanProject',
      handler: async () => {
        const activeProjectName = stateManager.getActiveProjectName();
        if (!activeProjectName) {
          vscode.window.showWarningMessage('No active project to clean.');
          return;
        }

        const project = getProjectByName(activeProjectName);
        if (!project) {
          vscode.window.showErrorMessage(`Project not found: ${activeProjectName}`);
          return;
        }

        try {
          const brokenLinks = linksStorage.getBrokenLinks(project.rootPath);
          if (brokenLinks.length === 0) {
            vscode.window.showInformationMessage('No broken links found.');
            return;
          }

          // Show confirmation dialog
          const message = `Found ${brokenLinks.length} broken link(s) to missing external files. Do you want to remove them?`;
          const action = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            'Remove'
          );

          if (action !== 'Remove') {
            return;
          }

          brokenLinks.forEach(link => {
            linksStorage.removeLink(project.rootPath, link.id);
          });
          treeProvider.refresh();
          vscode.window.showInformationMessage(`Removed ${brokenLinks.length} broken link(s).`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to clean project: ${error}`);
        }
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
      id: 'projectviewer.addExternalFile',
      handler: async (node?: ProjectNode) => {
        const activeProjectName = stateManager.getActiveProjectName();
        if (!activeProjectName) {
          vscode.window.showWarningMessage('No active project to add external files.');
          return;
        }

        const project = getProjectByName(activeProjectName);
        if (!project) {
          vscode.window.showErrorMessage(`Project not found: ${activeProjectName}`);
          return;
        }

        const selections = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: true,
          openLabel: 'Add File(s) to Project'
        });

        if (!selections || selections.length === 0) {
          return;
        }

        const parentId = node?.contextValue === 'manualDir'
          ? node.linkId
          : node?.contextValue === 'physicalDir'
            ? node.id
            : undefined;

        let addedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        for (const selection of selections) {
          const itemPath = selection.fsPath;
          const name = path.basename(itemPath);
          try {
            linksStorage.addLink(project.rootPath, name, itemPath, undefined, parentId);
            addedCount++;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('already exists')) {
              skippedCount++;
            } else {
              errors.push(message);
            }
          }
        }

        if (addedCount > 0) {
          treeProvider.refresh();
        }

        if (errors.length > 0) {
          vscode.window.showErrorMessage(`Failed to add ${errors.length} external file(s): ${errors[0]}`);
          return;
        }

        if (addedCount === 0 && skippedCount > 0) {
          vscode.window.showWarningMessage('No external files added. All selections already exist under this node.');
          return;
        }

        if (skippedCount > 0) {
          vscode.window.showInformationMessage(
            `Added ${addedCount} external file(s). Skipped ${skippedCount} duplicate(s).`
          );
          return;
        }

        vscode.window.showInformationMessage(`Added ${addedCount} external file(s).`);
      }
    },
    {
      id: 'projectviewer.addExternalFolder',
      handler: async (node?: ProjectNode) => {
        const activeProjectName = stateManager.getActiveProjectName();
        if (!activeProjectName) {
          vscode.window.showWarningMessage('No active project to add external folders.');
          return;
        }

        const project = getProjectByName(activeProjectName);
        if (!project) {
          vscode.window.showErrorMessage(`Project not found: ${activeProjectName}`);
          return;
        }

        const selections = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: true,
          openLabel: 'Add Folder(s) to Project'
        });

        if (!selections || selections.length === 0) {
          return;
        }

        const parentId = node?.contextValue === 'manualDir'
          ? node.linkId
          : node?.contextValue === 'physicalDir'
            ? node.id
            : undefined;

        let addedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        for (const selection of selections) {
          const itemPath = selection.fsPath;
          const name = path.basename(itemPath);
          try {
            linksStorage.addLink(project.rootPath, name, itemPath, undefined, parentId);
            addedCount++;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('already exists')) {
              skippedCount++;
            } else {
              errors.push(message);
            }
          }
        }

        if (addedCount > 0) {
          treeProvider.refresh();
        }

        if (errors.length > 0) {
          vscode.window.showErrorMessage(`Failed to add ${errors.length} external folder(s): ${errors[0]}`);
          return;
        }

        if (addedCount === 0 && skippedCount > 0) {
          vscode.window.showWarningMessage('No external folders added. All selections already exist under this node.');
          return;
        }

        if (skippedCount > 0) {
          vscode.window.showInformationMessage(
            `Added ${addedCount} external folder(s). Skipped ${skippedCount} duplicate(s).`
          );
          return;
        }

        vscode.window.showInformationMessage(`Added ${addedCount} external folder(s).`);
      }
    },
    {
      id: 'projectviewer.newFile',
      handler: async (node?: ProjectNode) => {
        const targetDirectory = getTargetDirectory(node);
        if (!targetDirectory) {
          vscode.window.showWarningMessage('Select a project or directory to add a file.');
          return;
        }

        const fileName = await vscode.window.showInputBox({
          prompt: 'Enter new file name',
          validateInput: (value) => {
            const trimmed = value.trim();
            if (!trimmed) {
              return 'File name cannot be empty';
            }
            if (/[\\/]/.test(trimmed)) {
              return 'File name cannot contain path separators';
            }
            return undefined;
          }
        });

        if (!fileName) {
          return;
        }

        const newFilePath = path.join(targetDirectory, fileName.trim());
        if (await pathExists(newFilePath)) {
          vscode.window.showErrorMessage(`File already exists: ${fileName.trim()}`);
          return;
        }

        try {
          await vscode.workspace.fs.writeFile(
            vscode.Uri.file(newFilePath),
            new Uint8Array()
          );
          treeProvider.refresh();
          vscode.window.showInformationMessage(`Created file: ${fileName.trim()}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to create file: ${error}`);
        }
      }
    },
    {
      id: 'projectviewer.newFolder',
      handler: async (node?: ProjectNode) => {
        const targetDirectory = getTargetDirectory(node);
        if (!targetDirectory) {
          vscode.window.showWarningMessage('Select a project or directory to add a folder.');
          return;
        }

        const folderName = await vscode.window.showInputBox({
          prompt: 'Enter new folder name',
          validateInput: (value) => {
            const trimmed = value.trim();
            if (!trimmed) {
              return 'Folder name cannot be empty';
            }
            if (/[\\/]/.test(trimmed)) {
              return 'Folder name cannot contain path separators';
            }
            return undefined;
          }
        });

        if (!folderName) {
          return;
        }

        const newFolderPath = path.join(targetDirectory, folderName.trim());
        if (await pathExists(newFolderPath)) {
          vscode.window.showErrorMessage(`Folder already exists: ${folderName.trim()}`);
          return;
        }

        try {
          await vscode.workspace.fs.createDirectory(vscode.Uri.file(newFolderPath));
          treeProvider.refresh();
          vscode.window.showInformationMessage(`Created folder: ${folderName.trim()}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to create folder: ${error}`);
        }
      }
    },
    {
      id: 'projectviewer.removeLink',
      handler: async (node?: ProjectNode) => {
        const activeProjectName = stateManager.getActiveProjectName();
        if (!activeProjectName) {
          vscode.window.showWarningMessage('No active project to remove links.');
          return;
        }

        if (!node?.linkId) {
          vscode.window.showErrorMessage('Selected item is not a manual link.');
          return;
        }

        const project = getProjectByName(activeProjectName);
        if (!project) {
          vscode.window.showErrorMessage(`Project not found: ${activeProjectName}`);
          return;
        }

        const confirmed = await vscode.window.showWarningMessage(
          `Remove link "${node.label}" from project? This will not delete files from disk.`,
          { modal: true },
          'Remove'
        );

        if (confirmed !== 'Remove') {
          return;
        }

        try {
          linksStorage.removeLink(project.rootPath, node.linkId);
          treeProvider.refresh();
          vscode.window.showInformationMessage(`Removed link: ${node.label}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to remove link: ${error}`);
        }
      }
    },
    {
      id: 'projectviewer.copyPath',
      handler: async (node?: ProjectNode) => {
        if (!node?.itemPath) {
          vscode.window.showWarningMessage('No item selected to copy.');
          return;
        }

        await vscode.env.clipboard.writeText(node.itemPath);
        vscode.window.showInformationMessage('Copied path to clipboard.');
      }
    },
    {
      id: 'projectviewer.copyRelativePath',
      handler: async (node?: ProjectNode) => {
        if (!node?.itemPath) {
          vscode.window.showWarningMessage('No item selected to copy.');
          return;
        }

        const activeProjectName = stateManager.getActiveProjectName();
        if (!activeProjectName) {
          vscode.window.showWarningMessage('No active project for relative path.');
          return;
        }

        const project = getProjectByName(activeProjectName);
        if (!project) {
          vscode.window.showErrorMessage(`Project not found: ${activeProjectName}`);
          return;
        }

        const relative = path.relative(project.rootPath, node.itemPath);
        await vscode.env.clipboard.writeText(relative);
        vscode.window.showInformationMessage('Copied relative path to clipboard.');
      }
    },
    {
      id: 'projectviewer.openContainingFolder',
      handler: async (node?: ProjectNode) => {
        if (!node?.itemPath) {
          vscode.window.showWarningMessage('No item selected to open.');
          return;
        }

        const targetPath =
          node.contextValue === 'physicalFile' ||
          node.contextValue === 'manualFile' ||
          node.contextValue === 'brokenLink'
            ? path.dirname(node.itemPath)
            : node.itemPath;

        if (!(await pathExists(targetPath))) {
          vscode.window.showWarningMessage('Containing folder does not exist.');
          return;
        }

        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(targetPath));
      }
    }
  ];

  // Register each command
  commands.forEach(cmd => {
    const disposable = vscode.commands.registerCommand(cmd.id, cmd.handler);
    context.subscriptions.push(disposable);
  });

  // Reveal active file in tree
  context.subscriptions.push(
    vscode.commands.registerCommand('projectviewer.revealActiveFile', async () => {
      if (!isRevealActiveFileEnabled()) {
        vscode.window.showInformationMessage('Reveal Active File is disabled in settings.');
        return;
      }

      const startTime = Date.now();
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showInformationMessage('No active editor to reveal.');
        return;
      }

      const activeProjectName = stateManager.getActiveProjectName();
      if (!activeProjectName) {
        vscode.window.showWarningMessage('No active project to reveal against.');
        return;
      }

      const project = getProjectByName(activeProjectName);
      if (!project) {
        vscode.window.showErrorMessage(`Project not found: ${activeProjectName}`);
        return;
      }

      const targetPath = activeEditor.document.uri.fsPath;
      logRevealActiveFile(`Start; targetPath=${targetPath}`);

      const rootsStart = Date.now();
      const roots = await treeProvider.getChildren();
      logRevealActiveFile(`Root nodes fetched in ${Date.now() - rootsStart}ms; count=${roots.length}`);
      const projectRoot = roots.find(root => root.label === project.name);
      if (!projectRoot) {
        vscode.window.showInformationMessage('Project not visible in the tree.');
        return;
      }

      let visitedNodes = 0;
      const findNodeByPath = async (node: ProjectNode): Promise<ProjectNode | undefined> => {
        visitedNodes += 1;
        if (node.itemPath === targetPath) {
          return node;
        }

        const children = await treeProvider.getChildren(node);
        for (const child of children) {
          const match = await findNodeByPath(child);
          if (match) {
            return match;
          }
        }
        return undefined;
      };

      const searchStart = Date.now();
      const match = await findNodeByPath(projectRoot);
      logRevealActiveFile(
        `Search finished in ${Date.now() - searchStart}ms; visited=${visitedNodes}`
      );
      if (!match) {
        vscode.window.showInformationMessage('Active file is not part of the project tree.');
        return;
      }

      const revealStart = Date.now();
      await treeView.reveal(match, { select: true, focus: false, expand: true });
      logRevealActiveFile(
        `Reveal completed in ${Date.now() - revealStart}ms; total=${Date.now() - startTime}ms`
      );
    })
  );

  // Register rename command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'projectviewer.renameItem',
      async (node: ProjectNode) => {
        const oldName = node.label;
        const oldPath = node.itemPath;
        const parentDir = path.dirname(oldPath);
        const newName = await vscode.window.showInputBox({
          prompt: 'Enter new name',
          value: oldName,
          validateInput: (value) => {
            const trimmed = value.trim();
            if (!trimmed) {
              return 'Name cannot be empty';
            }
            if (/[\\/]/.test(trimmed)) {
              return 'Name cannot contain path separators';
            }
            return undefined;
          }
        });

        if (!newName || newName === oldName) {
          return;
        }

        const newPath = path.join(parentDir, newName.trim());
        if (await pathExists(newPath)) {
          vscode.window.showErrorMessage(`An item named "${newName.trim()}" already exists.`);
          return;
        }

        try {
          await vscode.workspace.fs.rename(
            vscode.Uri.file(oldPath),
            vscode.Uri.file(newPath)
          );

          // A renamed physical directory changes its node id (physicalDir:<path>), which
          // would orphan any external links nested under it. Re-point them.
          if (node.contextValue === 'physicalDir') {
            const activeProjectName = stateManager.getActiveProjectName();
            const project = activeProjectName ? getProjectByName(activeProjectName) : undefined;
            if (project) {
              linksStorage.reparentLinks(
                project.rootPath,
                `physicalDir:${oldPath}`,
                `physicalDir:${newPath}`
              );
            }
          }

          treeProvider.refresh();
          vscode.window.showInformationMessage(`Renamed to: ${newName.trim()}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to rename: ${error}`);
        }
      }
    )
  );

  // Register delete command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'projectviewer.deleteItem',
      async (node: ProjectNode) => {
        const itemPath = node.itemPath;
        const uri = vscode.Uri.file(itemPath);
        const isDirectory = node.contextValue === 'physicalDir';
        let detail = '';

        if (isDirectory) {
          try {
            const count = await countEntries(uri);
            detail = ` (${count} item${count === 1 ? '' : 's'})`;
          } catch {
            detail = '';
          }
        }

        const result = await vscode.window.showWarningMessage(
          `Delete "${node.label}"${detail}? This cannot be undone.`,
          { modal: true },
          'Delete'
        );

        if (result !== 'Delete') {
          return;
        }

        try {
          await vscode.workspace.fs.delete(uri, { recursive: isDirectory, useTrash: true });
          treeProvider.refresh();
          vscode.window.showInformationMessage(`Deleted: ${node.label}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to delete: ${error}`);
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

  // Restore the previously active project's watcher on startup. The tree already
  // renders the active project (getChildren reads stateManager), but without this
  // the FileWatcher is never recreated, so on-disk changes stop appearing until the
  // user re-selects the project. We deliberately do NOT call activateProject() here:
  // that would re-fire recent-project churn and refresh. We only need the watcher.
  const restoreActiveProject = (): void => {
    const persistedName = stateManager.getActiveProjectName();
    if (!persistedName) {
      return;
    }
    const project = projectsStorage.getProject(persistedName);
    if (!project) {
      // Project was deleted out-of-band; clear stale workspace state.
      stateManager.setActiveProjectName(undefined);
      return;
    }
    if (activeWatcher) {
      activeWatcher.dispose();
    }
    activeWatcher = new FileWatcher(project.rootPath, () => treeProvider.refresh());
    activeWatcher.start();
  };
  restoreActiveProject();

  // Add tree view to subscriptions
  context.subscriptions.push(treeView);
}

/**
 * Deactivation function for the extension.
 */
export function deactivate() {}
