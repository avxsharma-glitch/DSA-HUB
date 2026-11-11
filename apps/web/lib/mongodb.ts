import { MongoClient, type Db } from "mongodb";

type MongoGlobal = typeof globalThis & { __dsahubMongoClientPromise?: Promise<MongoClient> };
const globalWithMongo = globalThis as MongoGlobal;

export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured. Set it in .env.");
  const dbName = process.env.MONGODB_DB ?? "dsahub";
  globalWithMongo.__dsahubMongoClientPromise ??= new MongoClient(uri).connect();
  const client = await globalWithMongo.__dsahubMongoClientPromise;
  return client.db(dbName);
}
