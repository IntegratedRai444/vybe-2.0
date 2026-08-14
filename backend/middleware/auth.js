// Simple development middleware that allows all requests
export function devAuth(req, res, next) {
  // Skip authentication in development
  req.user = {
    id: "dev-user",
    username: "developer",
    email: "dev@example.com",
    roles: ["admin"],
  };
  next();
}
