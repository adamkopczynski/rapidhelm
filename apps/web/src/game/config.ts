import preset from '../../../../content/boats/k1-sandbox.json';
import { boatPresetSchema } from '@rapidhelm/content-schema';
export const baseline = boatPresetSchema.parse(preset);
