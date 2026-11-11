import "server-only";

import { MongoClient, ServerApiVersion, type Db } from "mongodb";

type MongoGlobal = typeof globalThis & {
  __dsahubMongoClientPromise?: Promise<MongoClient>;
};

const globalWithMongo = globalThis as MongoGlobal;
let productionClientPromise: Promise<MongoClient> | undefined;

function createMongoClient(uri: string): Promise<MongoClient> {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true
    }
  });

  return client.connect();
}

export function getMongoClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured. Set it in apps/web/.env.local.");
  }

  if (process.env.NODE_ENV === "development") {
    globalWithMongo.__dsahubMongoClientPromise ??= createMongoClient(uri);
    return globalWithMongo.__dsahubMongoClientPromise;
  }

  productionClientPromise ??= createMongoClient(uri);
  return productionClientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getMongoClientPromise();
  return client.db(process.env.MONGODB_DB ?? "dsahub");
}
