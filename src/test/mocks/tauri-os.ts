import { vi } from 'vitest';

export const platform = vi.fn().mockResolvedValue('web');
export const version = vi.fn().mockResolvedValue('1.0.0');
export const type = vi.fn().mockResolvedValue('web');
export const arch = vi.fn().mockResolvedValue('x64');

export default {
  platform,
  version,
  type,
  arch,
};