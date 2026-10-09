import authoredRules from '../../../../content/rules/practice-slalom.json';
import { practiceRaceRulesSchema } from '@rapidhelm/content-schema';
export const practiceRules=practiceRaceRulesSchema.parse(authoredRules);
