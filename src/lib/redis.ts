// lib/redis.ts
import { Redis } from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// Re-export queues so existing imports from @/lib/redis still work
export { Queues } from "./queues";
export type {
  WhatsappOutboundJob,
  AppointmentReminderJob,
  AiConversationJob,
  AuditEventJob,
  PatientRetentionJob,
} from "./queues";
