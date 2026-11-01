import { z } from "zod";
import { registry } from "../openapi.ts";
import { UserSchema } from "./auth.validator.ts";

export const CATEGORIES = ["sale", "service", "job", "other"] as const;

export const AnnouncementParamsSchema = registry.register(
  "AnnouncementParams",
  z.object({
    id: z.coerce.number().int().positive(),
  }),
);

export const CreateAnnouncementSchema = registry.register(
  "CreateAnnouncement",
  z.object({
    title: z.string().min(5).max(50),
    description: z.string().min(10),
    // coerce: multipart/form-data sends all fields as strings
    price: z.coerce.number().positive(),
    category: z.enum(CATEGORIES),
  }),
);

export const UpdateAnnouncementSchema = registry.register(
  "UpdateAnnouncement",
  CreateAnnouncementSchema.partial(),
);

const ImageFileSchema = z.any().openapi({
  type: "string",
  format: "binary",
  description: "Announcement photo (image/*, max 5 MB)",
});

const CreateAnnouncementFormSchema = registry.register(
  "CreateAnnouncementForm",
  CreateAnnouncementSchema.extend({ image: ImageFileSchema.optional() }),
);

const UpdateAnnouncementFormSchema = registry.register(
  "UpdateAnnouncementForm",
  UpdateAnnouncementSchema.extend({ image: ImageFileSchema.optional() }),
);

export const GetAnnouncementsQuerySchema = registry.register(
  "GetAnnouncementsQuery",
  z.object({
    search: z.string().trim().optional(),
    sort: z.enum(["newest", "oldest"]).default("newest"),
    page: z.coerce.number().int().positive().default(1),
  }),
);

export type AnnouncementParams = z.infer<typeof AnnouncementParamsSchema>;
export type CreateAnnouncementBody = z.infer<typeof CreateAnnouncementSchema>;
export type UpdateAnnouncementBody = z.infer<typeof UpdateAnnouncementSchema>;
export type GetAnnouncementsQuery = z.infer<
  typeof GetAnnouncementsQuerySchema
>;

const AnnouncementSchema = registry.register(
  "Announcement",
  CreateAnnouncementSchema.extend({
    id: z.number().int(),
    imageUrl: z.url().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    user: UserSchema,
  }),
);

const AnnouncementListSchema = registry.register(
  "AnnouncementList",
  z.object({
    data: z.array(AnnouncementSchema),
    pagination: z.object({
      total: z.number().int(),
      page: z.number().int(),
      totalPages: z.number().int(),
      perPage: z.number().int(),
    }),
  }),
);

registry.registerPath({
  method: "get",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Get announcements with pagination, search and sorting",
  request: {
    query: GetAnnouncementsQuerySchema,
  },
  responses: {
    200: {
      description: "List of announcements with pagination metadata",
      content: { "application/json": { schema: AnnouncementListSchema } },
    },
    400: { description: "Invalid query parameters" },
  },
});

registry.registerPath({
  method: "get",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Get announcement by ID",
  request: {
    params: AnnouncementParamsSchema,
  },
  responses: {
    200: {
      description: "Announcement retrieved successfully",
      content: { "application/json": { schema: AnnouncementSchema } },
    },
    400: { description: "Invalid parameters" },
    404: { description: "Announcement not found" },
  },
});

registry.registerPath({
  method: "post",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Create announcement (optionally with a photo)",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": { schema: CreateAnnouncementFormSchema },
      },
    },
  },
  responses: {
    201: {
      description: "Announcement created successfully",
      content: { "application/json": { schema: AnnouncementSchema } },
    },
    400: { description: "Invalid file (not an image or too large)" },
    401: { description: "Authentication required" },
    422: { description: "Validation error" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Partially update own announcement (optionally replace photo)",
  security: [{ bearerAuth: [] }],
  request: {
    params: AnnouncementParamsSchema,
    body: {
      content: {
        "multipart/form-data": { schema: UpdateAnnouncementFormSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Announcement updated successfully",
      content: { "application/json": { schema: AnnouncementSchema } },
    },
    400: { description: "Invalid file (not an image or too large)" },
    401: { description: "Authentication required" },
    403: { description: "Access denied" },
    404: { description: "Announcement not found" },
    422: { description: "Validation error" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Delete own announcement",
  security: [{ bearerAuth: [] }],
  request: {
    params: AnnouncementParamsSchema,
  },
  responses: {
    204: { description: "Announcement deleted successfully" },
    401: { description: "Authentication required" },
    403: { description: "Access denied" },
    404: { description: "Announcement not found" },
  },
});
