import { z } from "zod";

export const keyDateAudienceSchema = z.enum(["everyone", "contractor", "property-investor"]);

export const keyDateSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be lowercase kebab-case"),
  date: z.iso.date(),
  title: z.string().min(1, "title is required"),
  description: z.string().min(1, "description is required"),
  audience: z.array(keyDateAudienceSchema).min(1, "at least one audience is required"),
  source: z.url("source must be a valid URL"),
  verified: z.boolean(),
});

export type KeyDateAudienceInput = z.infer<typeof keyDateAudienceSchema>;
export type KeyDateInput = z.infer<typeof keyDateSchema>;
