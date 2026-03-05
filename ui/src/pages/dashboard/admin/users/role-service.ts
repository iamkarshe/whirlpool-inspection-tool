export type Role = {
  title: string;
  value: string;
};

export const roles: Role[] = [
  { title: "Manager", value: "manager" },
  { title: "Operator", value: "operator" },
];

export const getRoles = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(roles);
    }, 1000);
  });
};
