export type UserStatus = "active" | "inactive" | "pending";

export type PlanName = "Basic" | "Team" | "Enterprise";

export interface User {
  id: number;
  name: string;
  email: string;
  country: string;
  role: string;
  image: string;
  status: UserStatus;
  plan_name: PlanName;
}

export const users: User[] = [
  {
    id: 1,
    name: "Stern Thireau",
    email: "sthireau0@prlog.org",
    country: "Portugal",
    role: "Construction Foreman",
    image: "/images/avatars/01.png",
    status: "active",
    plan_name: "Basic",
  },
  {
    id: 2,
    name: "Ford McKibbin",
    email: "fmckibbin1@slate.com",
    country: "Mexico",
    role: "Project Manager",
    image: "/images/avatars/02.png",
    status: "pending",
    plan_name: "Team",
  },
  {
    id: 3,
    name: "Foss Roglieri",
    email: "froglieri2@xing.com",
    country: "Brazil",
    role: "Construction Expeditor",
    image: "/images/avatars/03.png",
    status: "active",
    plan_name: "Basic",
  },
];
