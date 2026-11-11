# MongoDB Atlas setup

DSAHub uses MongoDB Atlas. No local MongoDB server is required.

1. Create a project and cluster at https://cloud.mongodb.com/.
2. Create a database user with read/write access to the DSAHub database.
3. Add your development IP address to Network Access. Avoid opening access to all IPs for production.
4. Select Connect → Drivers → Node.js and copy the connection string.
5. Copy `.env.example` to `.env` and set `MONGODB_URI` and `MONGODB_DB=dsahub`.

URL-encode reserved characters in the username or password. Keep `.env` private and never commit database credentials.
