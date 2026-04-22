import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    displayName: string;
    userRole: string;
    permissions: string;
    mustChangePassword: boolean;
  }
}
