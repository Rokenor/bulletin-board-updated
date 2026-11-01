import type { Request, Response } from "express";
import createHttpError from "http-errors";
import type { Prisma } from "../../generated/prisma/client.ts";
import prisma from "../../prisma/client.ts";
import { userSelect } from "./auth.controller.ts";
import { uploadImage } from "../services/cloudinary.ts";
import logger from "../logger.ts";
import type {
  AnnouncementParams,
  CreateAnnouncementBody,
  UpdateAnnouncementBody,
  GetAnnouncementsQuery,
} from "../validators/announcements.validator.ts";

const PER_PAGE = 10;

const includeUser = { user: { select: userSelect } } as const;

const findOwnAnnouncement = async (id: number, userId: number) => {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  if (announcement.userId !== userId) {
    throw createHttpError(403, "Access denied");
  }

  return announcement;
};

const uploadAnnouncementImage = async (
  file: Express.Multer.File | undefined,
  userId: number,
) => {
  if (!file) return undefined;

  const imageUrl = await uploadImage(file.path);
  logger.info(
    { userId, imageUrl, size: file.size, mimetype: file.mimetype },
    "Announcement image uploaded to Cloudinary",
  );

  return imageUrl;
};

export const getAllAnnouncements = async (
  _req: Request,
  res: Response<any, { query: GetAnnouncementsQuery }>,
) => {
  const { search, sort, page } = res.locals.query;

  const where: Prisma.AnnouncementWhereInput = {};

  if (search) {
    where.title = {
      contains: search,
      mode: "insensitive",
    };
  }

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
      include: includeUser,
    }),
    prisma.announcement.count({ where }),
  ]);

  res.status(200).json({
    data: announcements,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / PER_PAGE),
      perPage: PER_PAGE,
    },
  });
};

export const getAnnouncementById = async (
  req: Request<AnnouncementParams>,
  res: Response,
) => {
  const announcement = await prisma.announcement.findUnique({
    where: { id: req.params.id },
    include: includeUser,
  });

  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  res.status(200).json(announcement);
};

export const createAnnouncement = async (
  req: Request<{}, {}, CreateAnnouncementBody>,
  res: Response,
) => {
  const { title, description, price, category } = req.body;
  const userId = Number(req.user!.sub);

  const imageUrl = await uploadAnnouncementImage(req.file, userId);

  const announcement = await prisma.announcement.create({
    data: {
      title,
      description,
      price,
      category,
      imageUrl,
      user: {
        connect: { id: userId },
      },
    },
    include: includeUser,
  });

  logger.info(
    { announcementId: announcement.id, userId, hasImage: Boolean(imageUrl) },
    "Announcement created",
  );

  res.status(201).json(announcement);
};

export const updateAnnouncement = async (
  req: Request<AnnouncementParams, {}, UpdateAnnouncementBody>,
  res: Response,
) => {
  const { id } = req.params;
  const userId = Number(req.user!.sub);

  if (Object.keys(req.body).length === 0 && !req.file) {
    throw createHttpError(422, "At least one field or image must be provided");
  }

  await findOwnAnnouncement(id, userId);

  const { title, description, price, category } = req.body;
  const imageUrl = await uploadAnnouncementImage(req.file, userId);

  const updated = await prisma.announcement.update({
    where: { id },
    data: { title, description, price, category, imageUrl },
    include: includeUser,
  });

  logger.info({ announcementId: id, userId }, "Announcement updated");

  res.status(200).json(updated);
};

export const deleteAnnouncement = async (
  req: Request<AnnouncementParams>,
  res: Response,
) => {
  const { id } = req.params;

  await findOwnAnnouncement(id, Number(req.user!.sub));

  await prisma.announcement.delete({
    where: { id },
  });

  res.status(204).end();
};
