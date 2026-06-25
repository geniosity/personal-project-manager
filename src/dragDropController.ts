import * as path from 'path';
import * as vscode from 'vscode';
import type { ProjectNode } from './extension';
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
export class TreeDragDropController implements vscode.TreeDragAndDropController<ProjectNode> {
  readonly dragMimeTypes = ['application/vnd.code.tree-projectviewer'];
  readonly dropMimeTypes = ['application/vnd.code.tree-projectviewer', 'text/uri-list'];

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
    source: readonly ProjectNode[],
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
    target: ProjectNode | undefined,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    try {
      // Internal tree moves take priority: an internal drag may also carry a
      // uri-list, so checking the internal mime first prevents mis-routing an
      // internal move as an external add.
      const internal = dataTransfer.get('application/vnd.code.tree-projectviewer');
      if (internal) {
        const dragStr = await internal.asString();
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
        return;
      }

      // External drops from OS Explorer / other views arrive as a uri-list.
      const uriItem = dataTransfer.get('text/uri-list');
      if (uriItem) {
        const uris = (await uriItem.asString())
          .split(/\r?\n/)
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('#'));
        await this.addExternalUris(uris, target);
      }
    } catch (error) {
      console.error('Failed to handle drop:', error);
      vscode.window.showErrorMessage('Failed to drop items');
    }
  }

  /**
   * Add a list of dropped URIs as external links under the drop target.
   * Non-file URIs are skipped. Mirrors the add-external command tally.
   * @param uris URI strings parsed from a text/uri-list drop
   * @param target The node the items were dropped onto, or undefined for root
   */
  private async addExternalUris(uris: string[], target: ProjectNode | undefined): Promise<void> {
    const projectRoot = this.getActiveProjectRoot();
    if (!projectRoot) {
      vscode.window.showWarningMessage('No active project to add external items.');
      return;
    }

    let parentId: string | undefined;
    if (target?.contextValue === 'manualDir') {
      parentId = target.linkId;
    } else if (target?.contextValue === 'physicalDir') {
      parentId = `physicalDir:${target.itemPath}`;
    } else {
      parentId = undefined;
    }

    let addedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const uri of uris) {
      const parsed = vscode.Uri.parse(uri);
      if (parsed.scheme !== 'file') {
        continue;
      }

      const fsPath = parsed.fsPath;
      try {
        this.linksStorage.addLink(projectRoot, path.basename(fsPath), fsPath, undefined, parentId);
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
      this.refreshTree();
    }

    if (errors.length > 0) {
      vscode.window.showErrorMessage(`Failed to add ${errors.length} item(s): ${errors[0]}`);
      return;
    }

    if (addedCount === 0 && skippedCount > 0) {
      vscode.window.showWarningMessage('No items added. All dropped items already exist under this node.');
      return;
    }

    if (skippedCount > 0) {
      vscode.window.showInformationMessage(
        `Added ${addedCount} item(s). Skipped ${skippedCount} duplicate(s).`
      );
      return;
    }

    if (addedCount > 0) {
      vscode.window.showInformationMessage(`Added ${addedCount} item(s).`);
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
      } else if (target.contextValue === 'physicalDir') {
        parentId = `physicalDir:${target.itemPath}`;
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

    // Moving a physical dir changes its node id; re-point nested external links.
    if (dragged.contextValue === 'physicalDir') {
      const projectRoot = this.getActiveProjectRoot();
      if (projectRoot) {
        this.linksStorage.reparentLinks(
          projectRoot,
          `physicalDir:${sourcePath}`,
          `physicalDir:${destinationPath}`
        );
      }
    }

    // Don't rely on the file watcher's debounce race to repaint — refresh explicitly.
    this.refreshTree();
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
