/**
 * Aligned with backend User + TimestampSoftDeleteMixin.
 * role_id is the FK; role is populated for display (e.g. from API join or lookup).
 */
export interface User {
  id: number;
  name: string;
  email: string;
  mobile_number: string;
  role_id: number;
  /** Display name of role (from join/lookup); not sent to API */
  role: string;
  designation: string;
  is_active: boolean;
}

export const users: User[] = [
  {
    id: 1,
    name: "Amit Sharma",
    email: "amit.sharma@whirlpool.com",
    mobile_number: "+919876543210",
    role_id: 1,
    role: "Manager",
    designation: "Plant Manager",
    is_active: true,
  },
  {
    id: 2,
    name: "Priya Verma",
    email: "priya.verma@whirlpool.com",
    mobile_number: "+919123456780",
    role_id: 2,
    role: "Operator",
    designation: "Senior Line Operator",
    is_active: true,
  },
  {
    id: 3,
    name: "Rahul Gupta",
    email: "rahul.gupta@whirlpool.com",
    mobile_number: "+919012345678",
    role_id: 2,
    role: "Operator",
    designation: "Quality Inspector",
    is_active: true,
  },
];

export const getUsers = async (): Promise<User[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(users);
    }, 3000);
  });
};
