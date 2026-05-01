/** Aligned with backend Role: id, role, description */
export interface Role {
  id: number;
  role: string;
  description: string;
}

/** Roles assignable via admin UI forms (never `superadmin`). */
export const roles: Role[] = [
  { id: 1, role: "manager", description: "Plant or area manager (ops + oversight)" },
  { id: 2, role: "operator", description: "Line operator or inspector (ops PWA)" },
];

export const getRoles = async (): Promise<Role[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(roles);
    }, 1000);
  });
};
