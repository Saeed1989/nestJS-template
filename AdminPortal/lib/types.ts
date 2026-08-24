export type AdminUser = {
  id: string;
  email: string;
  roles: string[];
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ListMeta = { page: number; limit: number; total: number; totalPages: number };
export type ListResponse<T> = { data: T[]; meta: ListMeta };

export type AuditLogEntry = {
  id: string;
  actorId: string;
  action: string;
  targetUserId: string;
  changes: unknown;
  createdAt: string;
  ip: string | null;
};
