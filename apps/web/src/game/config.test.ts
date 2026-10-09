import { expect, test } from 'vitest';
import { boatConfigSchema } from '@rapidhelm/content-schema';
import { baseline } from './config';
test('baseline validates and invalid tuning is rejected', () => {
  expect(boatConfigSchema.safeParse(baseline.config).success).toBe(true);
  for (const value of [NaN, Infinity, 0, -10, 161]) expect(boatConfigSchema.safeParse({ ...baseline.config, mass: value }).success).toBe(false);
  expect(boatConfigSchema.safeParse({ ...baseline.config, forwardDrag: -1 }).success).toBe(false);
});
