export type UserStatus = "active" | "inactive" | "pending";

export type PlanName = "Basic" | "Team" | "Enterprise";

export interface User {
  id: number;
  name: string;
  email: string;
  mobile_number: string;
  role: string;
  designation: string;
  country: string;
  image: string;
  status: UserStatus;
  plan_name: PlanName;
}

export const users: User[] = [
  {
    id: 1,
    name: "Amit Sharma",
    email: "amit.sharma@whirlpool.com",
    mobile_number: "+91-9876543210",
    role: "Manager",
    designation: "Plant Manager",
    country: "India",
    image: "/images/avatars/01.png",
    status: "active",
    plan_name: "Basic",
  },
  {
    id: 2,
    name: "Priya Verma",
    email: "priya.verma@whirlpool.com",
    mobile_number: "+91-9123456780",
    role: "Operator",
    designation: "Senior Line Operator",
    country: "India",
    image: "/images/avatars/02.png",
    status: "pending",
    plan_name: "Team",
  },
  {
    id: 3,
    name: "Rahul Gupta",
    email: "rahul.gupta@whirlpool.com",
    mobile_number: "+91-9012345678",
    role: "Operator",
    designation: "Quality Inspector",
    country: "India",
    image: "/images/avatars/03.png",
    status: "active",
    plan_name: "Basic",
  },
];

export const getUsers = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(users);
    }, 3000);
  });
};
