import authoredVenue from '../../../../content/venues/training-channel.json';
import { riverVenueSchema } from '@rapidhelm/content-schema';
export const trainingVenue = riverVenueSchema.parse(authoredVenue);
