import { z } from 'zod';
export const venueSchema = z.object({ version: z.literal(1), id: z.string().min(1), name: z.string().min(1), channelWidth: z.number().positive(), channelLength: z.number().positive() });
export type Venue = z.infer<typeof venueSchema>;
