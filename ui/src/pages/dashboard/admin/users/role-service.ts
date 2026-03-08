/** Aligned with backend Role: id, role, description */
export interface Role {
  id: number;
  role: string;
  description: string;
}

/** For dropdown: value is role (API key), label can be role or description */
export const roles: Role[] = [
  { id: 1, role: "manager", description: "Plant or area manager" },
  { id: 2, role: "operator", description: "Line operator or inspector" },
  { id: 3, role: "admin", description: "System administrator" },
];

export const getRoles = async (): Promise<Role[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(roles);
    }, 1000);
  });
};
