import { defineSiteConfig } from '@/core';
import en from './labels/en';
import it from './labels/it';

/** This Site's developer-owned choices, read by the Core. */
export const siteConfig = defineSiteConfig({
  labels: { it, en },
});
