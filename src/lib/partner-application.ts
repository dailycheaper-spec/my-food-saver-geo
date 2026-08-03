import { z } from "zod";

/** Shape of the partner application form, shared by submit and resubmit. */
export const applicationPatchSchema = z.object({
  name: z.string().trim().min(1).max(120),
  logo: z.string().trim().max(16).optional().nullable(),
  entity_type: z.enum(["company", "individual_entrepreneur"]),
  category: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  district: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(255),
  phone: z.string().trim().max(40).optional().nullable(),
  contact_email: z.string().trim().email().max(255),
  company_name: z.string().trim().max(160).optional().nullable(),
  company_id_number: z.string().trim().min(5).max(40),
  description: z.string().trim().max(2000).optional().nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});


export type ApplicationPatch = z.infer<typeof applicationPatchSchema>;
