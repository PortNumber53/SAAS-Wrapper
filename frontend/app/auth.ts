import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { XataAdapter } from "@auth/xata-adapter"
import { xata } from "@/lib/xata"

export const runtime = 'edge'

const handler = NextAuth({
  adapter: XataAdapter(xata) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) {
        return false
      }
      return true
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id
        session.user.profile = token.profile
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.profile = user.profile
      }
      return token
    },
  },
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: '/login'
  }
})

export const { auth, signIn, signOut } = handler
export const { GET, POST } = handler