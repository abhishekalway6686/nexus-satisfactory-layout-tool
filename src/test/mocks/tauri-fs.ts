import { vi } from 'vitest';

export const readTextFile = vi.fn().mockResolvedValue('');
export const writeTextFile = vi.fn().mockResolvedValue(null);
export const exists = vi.fn().mockResolvedValue(false);
export const createDir = vi.fn().mockResolvedValue(null);
export const removeFile = vi.fn().mockResolvedValue(null);

export default {
  readTextFile,
  writeTextFile,
  exists,
  createDir,
  removeFile,
};