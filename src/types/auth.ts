export type LoginRequest = {
  email: string;
  password: string;
  provider: "EMAIL";
};

export type AuthenticatedUser = {
  uuid: string;
  name: string;
  email: string;
};

export type LoginResponse = {
  message: string;
  accessToken: string;
  user: AuthenticatedUser;
};
