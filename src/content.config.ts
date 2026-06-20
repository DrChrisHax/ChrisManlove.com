import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date().nullish(),
  }),
});

export const collections = { blog };
