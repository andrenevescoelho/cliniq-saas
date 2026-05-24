// modules/auth/utils/ability.ts
// RBAC using CASL — define what each role can do

import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
  type InferSubjects,
} from "@casl/ability";
import type { UserRole } from "@prisma/client";

// Define all subjects
type Subjects =
  | "Patient"
  | "Appointment"
  | "Schedule"
  | "WhatsApp"
  | "Conversation"
  | "Financial"
  | "Payment"
  | "Report"
  | "User"
  | "Clinic"
  | "Automation"
  | "AI"
  | "AuditLog"
  | "all";

type Actions = "create" | "read" | "update" | "delete" | "manage";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export function buildAbilityFor(role: UserRole): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(
    createMongoAbility
  );

  switch (role) {
    case "SUPER_ADMIN":
      can("manage", "all");
      break;

    case "CLINIC_OWNER":
      can("manage", "all");
      break;

    case "CLINIC_ADMIN":
      can("manage", "Patient");
      can("manage", "Appointment");
      can("manage", "Schedule");
      can("manage", "WhatsApp");
      can("manage", "Conversation");
      can("manage", "Financial");
      can("manage", "Payment");
      can("manage", "User");
      can("manage", "Automation");
      can("manage", "AI");
      can("read", "Report");
      can("read", "AuditLog");
      can("read", "Clinic");
      can("update", "Clinic");
      cannot("delete", "Clinic");
      break;

    case "DOCTOR":
      can("read", "Patient");
      can("update", "Patient");
      can("create", "Patient");
      can("manage", "Appointment");
      can("read", "Schedule");
      can("read", "Conversation");
      can("read", "Report");
      cannot("read", "Financial");
      cannot("read", "Payment");
      break;

    case "RECEPTIONIST":
      can("read", "Patient");
      can("create", "Patient");
      can("update", "Patient");
      can("manage", "Appointment");
      can("read", "Schedule");
      can("manage", "Conversation");
      can("read", "WhatsApp");
      cannot("read", "Financial");
      cannot("read", "Report");
      cannot("read", "User");
      break;

    case "FINANCIAL":
      can("read", "Patient");
      can("manage", "Financial");
      can("manage", "Payment");
      can("read", "Appointment");
      can("read", "Report");
      cannot("manage", "Appointment");
      cannot("read", "WhatsApp");
      cannot("read", "Conversation");
      break;

    default:
      // no permissions
      break;
  }

  return build();
}

// React hook helper
export function useAbility(role: UserRole) {
  return buildAbilityFor(role);
}
