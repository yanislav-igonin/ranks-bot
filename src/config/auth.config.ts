const AuthConfig = {
  users: process.env.USERS?.split(',').map((u): number => parseInt(u, 10)) || [],
};

export { AuthConfig };
