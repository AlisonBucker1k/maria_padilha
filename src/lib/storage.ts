import { syllosStorageFetch } from "./syllos-api";

export type StorageDisk = {
  name: string;
  driver: string;
  root: string | null;
};

export type StorageEntry = {
  name: string;
  path: string;
  type: "directory" | "file";
  size?: number | null;
  modified_at?: string | null;
};

export type StorageBrowseResult = {
  disk: string;
  path: string;
  parent: string | null;
  directories: StorageEntry[];
  files: StorageEntry[];
  totals: {
    directories: number;
    files: number;
  };
};

type DisksResponse = {
  message: string;
  data: {
    disks: StorageDisk[];
  };
};

type BrowseResponse = {
  message: string;
  data: StorageBrowseResult;
};

export async function listarDiscos(): Promise<StorageDisk[]> {
  const response = await syllosStorageFetch<DisksResponse>("disks");
  return response.data.disks;
}

export async function navegarStorage(
  disk: string,
  path = "",
): Promise<StorageBrowseResult> {
  const params = new URLSearchParams({ disk });

  if (path) {
    params.set("path", path);
  }

  const response = await syllosStorageFetch<BrowseResponse>("browse", params);
  return response.data;
}
