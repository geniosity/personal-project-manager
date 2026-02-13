import * as vscode from 'vscode';

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
  constructor(private onDrop: (draggedId: string, targetId: string) => Promise<void>) {}

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
    const dragData = source.map(item => ({
      id: item.id,
      label: item.label,
      contextValue: item.contextValue,
      itemPath: item.itemPath
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

      if (Array.isArray(dragData) && dragData.length > 0) {
        const first = dragData[0];
        await this.onDrop(first.id, target.id);
      }
    } catch (error) {
      console.error('Failed to handle drop:', error);
      vscode.window.showErrorMessage('Failed to drop items');
    }
  }
}
