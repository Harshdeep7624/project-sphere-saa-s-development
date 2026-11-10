import mongoose, { Schema, models, model } from "mongoose";

export interface IAuditLog {
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  action: string;
  targetEntity: string;
  targetId: string;
  details?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, required: true },
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetEntity: {
      type: String,
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ "actor.id": 1, createdAt: -1 });

const AuditLog =
  models.AuditLog || model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
