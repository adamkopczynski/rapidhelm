import authoredVenue from '../../../../content/venues/training-channel.json';
import { riverVenueSchema } from '@rapidhelm/content-schema';
export const trainingVenue = riverVenueSchema.parse(authoredVenue);

import parisVenue from '../../../../content/venues/vaires-sur-marne.json';
export const initialVenue = riverVenueSchema.parse(parisVenue);
