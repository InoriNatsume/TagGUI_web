import { ImageRecord } from "../models/ImageRecord";

export interface TagSnapshot {
  actionName: string;
  tagsById: Map<string, string[]>;
  shouldConfirm: boolean;
}

export interface RestoreResult {
  images: ImageRecord[];
  changedIds: string[];
  actionName: string;
  shouldConfirm: boolean;
}

export class UndoRedoStack {
  private undoStack: TagSnapshot[] = [];
  private redoStack: TagSnapshot[] = [];
  private readonly limit: number;

  constructor(limit: number = 32) {
    this.limit = limit;
  }

  private captureTags(images: ImageRecord[]): Map<string, string[]> {
    const tagsById = new Map<string, string[]>();
    for (const image of images) {
      tagsById.set(image.id, image.tags.slice());
    }
    return tagsById;
  }

  pushSnapshot(
    actionName: string,
    images: ImageRecord[],
    shouldConfirm: boolean
  ): void {
    const snapshot: TagSnapshot = {
      actionName,
      tagsById: this.captureTags(images),
      shouldConfirm,
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  peekUndo(): TagSnapshot | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  peekRedo(): TagSnapshot | undefined {
    return this.redoStack[this.redoStack.length - 1];
  }

  undo(images: ImageRecord[]): RestoreResult | null {
    if (this.undoStack.length === 0) {
      return null;
    }
    const snapshot = this.undoStack.pop() as TagSnapshot;
    const redoSnapshot: TagSnapshot = {
      actionName: snapshot.actionName,
      tagsById: this.captureTags(images),
      shouldConfirm: snapshot.shouldConfirm,
    };
    this.redoStack.push(redoSnapshot);
    return this.applySnapshot(images, snapshot);
  }

  redo(images: ImageRecord[]): RestoreResult | null {
    if (this.redoStack.length === 0) {
      return null;
    }
    const snapshot = this.redoStack.pop() as TagSnapshot;
    const undoSnapshot: TagSnapshot = {
      actionName: snapshot.actionName,
      tagsById: this.captureTags(images),
      shouldConfirm: snapshot.shouldConfirm,
    };
    this.undoStack.push(undoSnapshot);
    return this.applySnapshot(images, snapshot);
  }

  private applySnapshot(
    images: ImageRecord[],
    snapshot: TagSnapshot
  ): RestoreResult {
    const changedIds: string[] = [];
    const nextImages = images.map((image) => {
      const nextTags = snapshot.tagsById.get(image.id);
      if (!nextTags) {
        return image;
      }
      if (tagsEqual(image.tags, nextTags)) {
        return image;
      }
      changedIds.push(image.id);
      return { ...image, tags: nextTags.slice() };
    });
    return {
      images: nextImages,
      changedIds,
      actionName: snapshot.actionName,
      shouldConfirm: snapshot.shouldConfirm,
    };
  }
}

function tagsEqual(a: string[], b: string[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
