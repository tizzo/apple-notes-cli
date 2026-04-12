export type NoteSummary = {
  id: string;
  name: string;
  folder: string;
  account: string;
  creationDate: string;
  modificationDate: string;
  shared: boolean;
  passwordProtected: boolean;
};

export type NoteDetail = NoteSummary & {
  body: string;
  plaintext: string;
  attachmentCount: number;
};

export type FolderInfo = {
  id: string;
  name: string;
  account: string;
  noteCount: number;
};

export type AccountInfo = {
  id: string;
  name: string;
  folderCount: number;
  noteCount: number;
};

export type DeleteResult = {
  deleted: boolean;
  id: string;
  name: string;
};

export type MoveResult = {
  moved: boolean;
  id: string;
  name: string;
  folder: string;
};

export type OutputFormat = "json" | "pretty";
