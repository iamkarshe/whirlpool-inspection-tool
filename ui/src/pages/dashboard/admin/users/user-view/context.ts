import type { UserResponse } from "@/api/generated/model/userResponse";

export type UserViewContext = {
  user: UserResponse;
  reloadUser: () => Promise<void>;
};
