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
    price: z.number().positive(),
    category: z.enum(CATEGORIES),
  }),
);

export const UpdateAnnouncementSchema = registry.register(
  "UpdateAnnouncement",
  CreateAnnouncementSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    { error: "At least one field must be provided" },
  ),
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
  summary: "Create announcement",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: CreateAnnouncementSchema },
      },
    },
  },
  responses: {
    201: {
      description: "Announcement created successfully",
      content: { "application/json": { schema: AnnouncementSchema } },
    },
    401: { description: "Authentication required" },
    422: { description: "Validation error" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Partially update own announcement",
  security: [{ bearerAuth: [] }],
  request: {
    params: AnnouncementParamsSchema,
    body: {
      content: {
        "application/json": { schema: UpdateAnnouncementSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Announcement updated successfully",
      content: { "application/json": { schema: AnnouncementSchema } },
    },
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
