import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = req.nextUrl.pathname;

      if (pathname.startsWith("/admin")) {
        return token?.role === "admin";
      }

      if (pathname.startsWith("/pray-room")) {
        return Boolean(token);
      }

      return true;
    }
  },
  pages: {
    signIn: "/login"
  }
});

export const config = {
  matcher: ["/pray-room/:path*", "/admin/:path*"]
};
