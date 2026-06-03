import { z } from "zod";

// ── Shared ──────────────────────────────────────────────────────────
export const uuidSchema = z.string().uuid();

// ── Auth / Cron headers ─────────────────────────────────────────────
export const cronAuthSchema = z.object({
  authorization: z.string().startsWith("Bearer "),
});

// ── /api/data ───────────────────────────────────────────────────────
export const dataActionSchema = z.enum(["select", "insert", "update", "upsert", "delete"]);

export const dataFetchSchema = z.object({
  action: dataActionSchema,
  table: z.string().min(1),
  filters: z.object({
    select: z.string().optional(),
    eq: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    gte: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    order: z.object({ column: z.string(), ascending: z.boolean().optional() }).optional(),
    limit: z.number().int().positive().max(1000).optional(),
    maybeSingle: z.boolean().optional(),
  }).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  id: z.string().optional(),
});

// ── /api/ai ────────────────────────────────────────────────────────
export const aiPromptSchema = z.object({
  prompt: z.string().min(1).max(5000),
});

// ── /api/auth/confirm ──────────────────────────────────────────────
export const authConfirmSchema = z.object({
  userId: z.string().min(1),
});

// ── /api/notifications/subscribe ────────────────────────────────────
export const notificationSubscribeSchema = z.discriminatedUnion("platform", [
  z.object({
    platform: z.literal("web"),
    user_id: z.string().min(1),
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  z.object({
    platform: z.literal("apns"),
    user_id: z.string().min(1),
    device_token: z.string().min(1),
    bundle_id: z.string().optional(),
  }),
]);

// ── /api/books ──────────────────────────────────────────────────────
export const bookActionSchema = z.enum(["select", "insert", "update", "delete"]);

export const bookPayloadSchema = z.object({
  user_id: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
  author: z.string().max(200).optional(),
  total_pages: z.number().int().positive().optional(),
  current_page: z.number().int().min(0).optional(),
  daily_goal: z.number().int().min(0).optional(),
  pages_read_today: z.number().int().min(0).optional(),
  target_date: z.string().optional(),
  color: z.string().optional(),
  cover_url: z.string().optional(),
});

export const booksRequestSchema = z.object({
  action: bookActionSchema,
  payload: bookPayloadSchema.optional(),
  id: z.string().optional(),
});

// ── /api/admin/manage ──────────────────────────────────────────────
export const adminManageActionSchema = z.enum([
  "block", "unblock", "add_admin", "remove_admin", "change_plan", "reset_data", "delete",
]);

export const adminManageSchema = z.object({
  user_id: z.string().min(1),
  action: adminManageActionSchema,
  reason: z.string().max(500).optional(),
  new_plan: z.enum(["free", "pro", "premium"]).optional(),
});

// ── /api/admin/audit (POST) ────────────────────────────────────────
export const auditLogSchema = z.object({
  action: z.string().min(1),
  target_type: z.string().optional(),
  target_id: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  ip_address: z.string().optional(),
});

// ── /api/admin/audit (GET query) ───────────────────────────────────
export const auditQuerySchema = z.object({
  action: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

// ── /api/admin/users (GET query) ───────────────────────────────────
export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
});

// ── /api/admin/stats (GET query) ───────────────────────────────────
export const adminStatsQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
});
