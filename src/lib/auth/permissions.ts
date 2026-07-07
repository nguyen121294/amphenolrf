export type UserRole = "super_admin" | "admin" | "user";

// Mapping of routes/pages to the roles allowed to access them.
// If a route is not listed here, it is considered open to all authenticated users.
export const PAGE_PERMISSIONS: Record<string, UserRole[]> = {
  "/console/users": ["super_admin", "admin"],
  "/console/masterdata/item-setting": ["super_admin", "admin", "user"], // All authenticated users can view
  "/console/masterdata/line-setting": ["super_admin", "admin", "user"],
  "/console/production/dashboard": ["super_admin", "admin", "user"],
  "/console/production/assembly": ["super_admin", "admin", "user"],
  "/console/production/packing": ["super_admin", "admin", "user"],
  "/console/production/records": ["super_admin", "admin", "user"],
  "/console/production/shipping-plan": ["super_admin", "admin", "user"],
  "/console/production/scheduling": ["super_admin", "admin", "user"],
};

// Mapping of specific operations/permissions to the roles allowed to execute them.
export const OPERATION_PERMISSIONS = {
  manage_items: ["super_admin", "admin"], // create, update, delete, import Excel
  manage_lines: ["super_admin", "admin"],
  manage_users: ["super_admin", "admin"],
};

export type OperationType = keyof typeof OPERATION_PERMISSIONS;

/**
 * Check if a role is allowed to access a specific page/route.
 */
export function canAccessPage(role: UserRole, pathname: string): boolean {
  // If the pathname exactly matches or starts with one of the protected paths
  for (const [route, allowedRoles] of Object.entries(PAGE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      return allowedRoles.includes(role as UserRole);
    }
  }
  return true;
}

/**
 * Check if a role is allowed to perform a specific action/operation.
 */
export function canPerformOperation(role: UserRole, operation: OperationType): boolean {
  return OPERATION_PERMISSIONS[operation].includes(role as UserRole);
}
