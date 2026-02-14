import * as path from 'path';
import * as vscode from 'vscode';
import { LinksStorage } from './linksStorage';
import { ProjectsStorage } from './storage';
import { StateManager } from './stateManager';

interface DragPayload {
  id: string;
  contextValue: string;
  itemPath: string;
  linkId?: string;
}

/**
 * Manages drag and drop operations for the project tree.
 */
export class TreeDragDropController implements vscode.TreeDragAndDropController<any> {
  readonly dragMimeTypes = ['application/vnd.code.tree-projectviewer'];
  readonly dropMimeTypes = ['application/vnd.code.tree-projectviewer'];

  /**
   * Creates a new TreeDragDropController instance.
   * @param onDrop Callback when items are dropped
   */
  constructor(
    private projectsStorage: ProjectsStorage,
    private linksStorage: LinksStorage,
    private stateManager: StateManager,
    private refreshTree: () => void
  ) {}

  /**
   * Handle drag operation.
   * @param source Items being dragged
   * @param dataTransfer Data transfer object
   * @param token Cancellation token
   */
  async handleDrag(
    source: readonly any[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    const dragData: DragPayload[] = source.map(item => ({
      id: item.id,
      contextValue: item.contextValue,
      itemPath: item.itemPath,
      linkId: item.linkId
    }));

    dataTransfer.set(
      'application/vnd.code.tree-projectviewer',
      new vscode.DataTransferItem(JSON.stringify(dragData))
    );
  }

  /**
   * Handle drop operation.
   * @param target Item being dropped onto
   * @param dataTransfer Data transfer object
   * @param token Cancellation token
   */
  async handleDrop(
    target: any,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    const dragDataItem = dataTransfer.get('application/vnd.code.tree-projectviewer');
    if (!dragDataItem) {
      return;
    }

    try {
      const dragStr = await dragDataItem.asString();
      const dragData = JSON.parse(dragStr);

      if (!Array.isArray(dragData) || dragData.length === 0) {
        return;
      }

      const dragged = dragData[0] as DragPayload;
      const targetNode = target as {
        contextValue?: string;
        itemPath?: string;
        linkId?: string;
      } | undefined;

      if (!targetNode?.contextValue || !targetNode.itemPath) {
        return;
      }

      if (dragged.contextValue.startsWith('manual')) {
        await this.handleManualDrop(dragged, targetNode);
        return;
      }

      if (dragged.contextValue === 'physicalFile' || dragged.contextValue === 'physicalDir') {
        await this.handlePhysicalDrop(dragged, targetNode);
      }
    } catch (error) {
      console.error('Failed to handle drop:', error);
      vscode.window.showErrorMessage('Failed to drop items');
    }
  }

  private getActiveProjectRoot(): string | undefined {
    const activeProjectName = this.stateManager.getActiveProjectName();
    if (!activeProjectName) {
      return undefined;
    }

    const project = this.projectsStorage.getProject(activeProjectName);
    return project?.rootPath;
  }

  private async handleManualDrop(
    dragged: DragPayload,
    target: { contextValue?: string; itemPath?: string; linkId?: string }
  ): Promise<void> {
    const projectRoot = this.getActiveProjectRoot();
    if (!projectRoot) {
      vscode.window.showWarningMessage('No active project to move manual links.');
      return;
    }

    if (!dragged.linkId) {
      vscode.window.showErrorMessage('Manual link data is missing.');
      return;
    }

    if (dragged.contextValue === 'manualFile' || dragged.contextValue === 'manualDir') {
      let parentId: string | undefined;
      if (target.contextValue === 'project') {
        parentId = undefined;
      } else if (target.contextValue === 'manualDir') {
        parentId = target.linkId;
      } else {
        vscode.window.showWarningMessage('Manual links can only be dropped on project or manual folders.');
        return;
      }

      const links = this.linksStorage.getLinks(projectRoot);
      if (parentId) {
        let current: string | undefined = parentId;
        while (current) {
          if (current === dragged.linkId) {
            vscode.window.showWarningMessage('Cannot move a manual link into itself.');
            return;
          }
          current = links[current]?.parentId;
        }
      }

      this.linksStorage.updateLinkMetadata(projectRoot, dragged.linkId, { parentId });
      this.refreshTree();
      return;
    }

    vscode.window.showWarningMessage('Only manual links can be moved this way.');
  }

  private async handlePhysicalDrop(
    dragged: DragPayload,
    target: { contextValue?: string; itemPath?: string }
  ): Promise<void> {
    if (target.contextValue !== 'project' && target.contextValue !== 'physicalDir') {
      vscode.window.showWarningMessage('Files can only be dropped on project or physical folders.');
      return;
    }

    const sourcePath = dragged.itemPath;
    const targetDir = target.itemPath as string;
    const normalizedSource = path.resolve(sourcePath);
    const normalizedTarget = path.resolve(targetDir);

    if (normalizedSource === normalizedTarget) {
      vscode.window.showWarningMessage('Cannot move an item onto itself.');
      return;
    }

    if (dragged.contextValue === 'physicalDir') {
      const relative = path.relative(normalizedSource, normalizedTarget);
      if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
        vscode.window.showWarningMessage('Cannot move a folder into itself.');
        return;
      }
    }

    const destinationPath = path.join(targetDir, path.basename(sourcePath));
    if (await this.pathExists(destinationPath)) {
      vscode.window.showWarningMessage('An item with the same name already exists in the destination.');
      return;
    }

    await vscode.workspace.fs.rename(
      vscode.Uri.file(sourcePath),
      vscode.Uri.file(destinationPath)
    );
  }

  private async pathExists(fsPath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(fsPath));
      return true;
    } catch {
      return false;
    }
  }
}
