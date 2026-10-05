import 'server-only';
import { createCore } from '@/core';
import { siteConfig } from './config';

export const core = createCore(siteConfig);
