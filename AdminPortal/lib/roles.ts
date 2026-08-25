// Mirrors auth-config's fixed role set (src/admin/roles.constant.ts). Never
// free text — role selection in the UI is always drawn from this list.
export const ROLES = ["super_admin", "admin", "user"] as const;
export type Role = (typeof ROLES)[number];
