import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { MongoDBAdapter } from "@auth/mongodb-adapter";

import { ensureDataIndexes } from "@/lib/db/indexes";
import type { UserProfileDocument } from "@/lib/db/models";
import { getDatabase, getMongoClientPromise } from "@/lib/mongodb";

const adapter = process.env.MONGODB_URI
  ? MongoDBAdapter(getMongoClientPromise(), {
      databaseName: process.env.MONGODB_DB ?? "dsahub"
    })
  : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  secret: process.env.AUTH_SECRET,
  providers: [
    GitHub({
      authorization: {
        params: {
          // Sign-in only. Repository access will use a separate GitHub App flow.
          scope: "read:user user:email"
        }
      }
    })
  ],
  session: {
    // With Atlas configured, sessions are persisted in MongoDB and can be revoked.
    strategy: adapter ? "database" : "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    }
  },
  events: {
    async createUser({ user }) {
      const db = await getDatabase();
      await ensureDataIndexes(db);

      const now = new Date();
      await db.collection<UserProfileDocument>("profiles").updateOne(
        { userId: user.id },
        {
          $setOnInsert: {
            userId: user.id,
            displayName: user.name ?? null,
            avatarUrl: user.image ?? null,
            timezone: "UTC",
            preferences: {
              theme: "dark",
              dailyGoal: 1,
              weeklyGoal: 5
            },
            privacy: {
              publicProfile: false,
              shareActivity: false
            },
            createdAt: now,
            updatedAt: now
          }
        },
        { upsert: true }
      );
    }
  }
});
