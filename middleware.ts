import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = req.nextUrl.pathname;

      if (pathname.startsWith("/admin")) {
        return token?.role === "admin";
      }

      return true;
    }
  },
  pages: {
    signIn: "/login"
  }
});

export const config = {
  matcher: ["/admin/:path*"]
};
