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

  const treeItem = new ProjectNode(
    node.label,
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

  if (node.contextValue === 'manualFile' || node.contextValue === 'manualDir') {
    treeItem.description = '(external)';
  }

  if (isBroken) {
    treeItem.iconPath = new vscode.ThemeIcon('warning');
  }

  if (node.contextValue === 'projectsContainer') {
    treeItem.iconPath = new vscode.ThemeIcon('briefcase');
  }

  return treeItem;
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
   * Get parent node for a given element.
   * Required for TreeView.reveal support.
   * @param element The node to find a parent for
   * @returns Parent node, or undefined if at root
   */
  getParent(element: ProjectNode): ProjectNode | undefined {
    if (element.contextValue === 'projectsContainer' || element.contextValue === 'separator') {
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
      // Return root level
      const projects = this.projectsStorage.getProjects();
      const activeProjectName = this.stateManager.getActiveProjectName();
      
      // If there's an active project, show it + a Projects container for the rest
      if (activeProjectName) {
        const activeProject = projects.find(p => p.name === activeProjectName);
        const inactiveProjects = projects.filter(p => p.name !== activeProjectName);
        
        const result: ProjectNode[] = [];
        
        // Add Projects container if there are inactive projects
        if (inactiveProjects.length > 0) {
          result.push(this.createProjectsContainerNode());
          
          // Add separator
          const separator = new ProjectNode(
            '─────────────────',
            vscode.TreeItemCollapsibleState.None,
            'separator',
            'separator',
            ''
          );
          result.push(separator);
        }

        // Add active project
        if (activeProject) {
          const activeNode = new ProjectNode(
            activeProject.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            'project',
            `project:${activeProject.name}`,
            activeProject.rootPath
          );
          activeNode.resourceUri = vscode.Uri.file(activeProject.rootPath);
          result.push(activeNode);
        }
        
        return Promise.resolve(result);
      }
      
      // No active project - show all projects at root level
      return Promise.resolve(
        projects.map(
          project => {
            const node = new ProjectNode(
              project.name,
              vscode.TreeItemCollapsibleState.None,
              'project',
              `project:${project.name}`,
              project.rootPath
            );
            node.resourceUri = vscode.Uri.file(project.rootPath);
            return node;
          }
        )
      );
    }

    // Handle Projects container
    if (element.contextValue === 'projectsContainer') {
      const projects = this.projectsStorage.getProjects();
      const activeProjectName = this.stateManager.getActiveProjectName();
      const inactiveProjects = projects.filter(p => p.name !== activeProjectName);
      
      return Promise.resolve(
        inactiveProjects.map(
          project => {
            const node = new ProjectNode(
              project.name,
              vscode.TreeItemCollapsibleState.None,
              'project',
              `project:${project.name}`,
              project.rootPath
            );
            node.resourceUri = vscode.Uri.file(project.rootPath);
            return node;
          }
        )
      );
    }

    if (element.contextValue === 'project') {
      console.log('[PPM] Getting children for project:', element.label);
      const activeProjectName = this.stateManager.getActiveProjectName();
      console.log('[PPM] Active project:', activeProjectName);
      if (element.label !== activeProjectName) {
        console.log('[PPM] Project not active, returning empty');
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

    const projectModel = this.treeModel.createProjectModel(
      activeProject.name,
      activeProject.rootPath
    );
    const targetNode = this.findNodeById(projectModel, element.id);
    if (!targetNode) {
      return Promise.resolve([]);
    }

    return Promise.resolve(targetNode.getChildren().map(convertNodeToTreeItem));
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

  private findNodeById(node: NodeModel, id: string): NodeModel | undefined {
    if (node.id === id) {
      return node;
    }

    for (const child of node.getChildren()) {
      const found = this.findNodeById(child, id);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  private findParentNode(node: NodeModel, childId: string): NodeModel | undefined {
    for (const child of node.getChildren()) {
      if (child.id === childId) {
        return node;
      }
      const found = this.findParentNode(child, childId);
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
  const projectsStorage = new ProjectsStorage(context.globalStoragePath);
  const linksStorage = new LinksStorage();
  const stateManager = new StateManager(context);
  const treeModel = new TreeModel(linksStorage);
  const outputChannel = vscode.window.createOutputChannel('Personal Project Manager');
  context.subscriptions.push(outputChannel);

  // Track active watcher
  let activeWatcher: FileWatcher | undefined;

  const activateProject = (project: IProject) => {
    console.log('[PPM] Activating project:', project.name);
    stateManager.setActiveProjectName(project.name);

    if (activeWatcher) {
      activeWatcher.dispose();
    }

    activeWatcher = new FileWatcher(project.rootPath, () => {
      treeProvider.refresh();
    });
    activeWatcher.start();
    treeProvider.refresh();
    console.log('[PPM] Project activated:', project.name);
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

  // Handle project selection (clicking on a project name to activate it)
  treeView.onDidChangeSelection(event => {
    console.log('[PPM] Tree selection changed, items:', event.selection.length);
    if (event.selection.length > 0) {
      const selected = event.selection[0];
      console.log('[PPM] Selected item:', selected.label, 'contextValue:', selected.contextValue);
      
      if (selected.contextValue === 'project') {
        console.log('[PPM] Project selected, attempting to activate:', selected.label);
        const project = getProjectByName(selected.label);
        if (project) {
          activateProject(project);
        } else {
          console.log('[PPM] Project not found:', selected.label);
        }
      }
    }
  });

  // Register all commands with placeholder handlers
  const commands = [
    {
      id: 'projectviewer.createNewProject',
      handler: async () => {
        console.log('[PPM] createNewProject command invoked');
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
        console.log('[PPM] renameProject command invoked, node:', node?.label);
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
        console.log('[PPM] deleteProject command invoked, node:', node?.label);
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
      id: 'projectviewer.addExternalLink',
      handler: async (node?: ProjectNode) => {
        console.log('[PPM] addExternalLink command invoked, node:', node?.label);
        const activeProjectName = stateManager.getActiveProjectName();
        if (!activeProjectName) {
          vscode.window.showWarningMessage('No active project to add external links.');
          return;
        }

        const project = getProjectByName(activeProjectName);
        if (!project) {
          vscode.window.showErrorMessage(`Project not found: ${activeProjectName}`);
          return;
        }

        const selections = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: true,
          canSelectMany: true,
          openLabel: 'Add to Project'
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
          vscode.window.showErrorMessage(`Failed to add ${errors.length} external item(s): ${errors[0]}`);
          return;
        }

        if (addedCount === 0 && skippedCount > 0) {
          vscode.window.showWarningMessage('No external items added. All selections already exist under this node.');
          return;
        }

        if (skippedCount > 0) {
          vscode.window.showInformationMessage(
            `Added ${addedCount} external item(s). Skipped ${skippedCount} duplicate(s).`
          );
          return;
        }

        vscode.window.showInformationMessage(`Added ${addedCount} external item(s).`);
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

  // Add tree view to subscriptions
  context.subscriptions.push(treeView);
}

/**
 * Deactivation function for the extension.
 */
export function deactivate() {}
