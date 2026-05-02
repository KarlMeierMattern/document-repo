import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    signIn({ profile }) {
      if (!ownerEmail) {
        console.error("OWNER_EMAIL not set; rejecting all sign-ins");
        return false;
      }
      const email = profile?.email?.toLowerCase().trim();
      return email === ownerEmail;
    },
    jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email;
      return token;
    },
    session({ session, token }) {
      if (token?.email) session.user.email = token.email as string;
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
});
