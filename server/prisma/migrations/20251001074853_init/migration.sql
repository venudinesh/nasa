-- CreateTable
CREATE TABLE "planets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pl_name" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "sy_dist" REAL,
    "pl_rade" REAL,
    "pl_bmasse" REAL,
    "pl_orbper" REAL,
    "pl_insol" REAL,
    "pl_eqt" REAL,
    "discoverymethod" TEXT NOT NULL,
    "discoveryyear" INTEGER NOT NULL,
    "st_spectype" TEXT,
    "st_teff" REAL,
    "image" TEXT,
    "special" TEXT,
    "classification" TEXT,
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "preferredUnits" TEXT NOT NULL DEFAULT 'metric',
    "interests" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "planetId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_messages_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_favorite_planets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_favorite_planets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_favorite_planets_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_info" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "planets_pl_name_key" ON "planets"("pl_name");

-- CreateIndex
CREATE UNIQUE INDEX "users_sessionId_key" ON "users"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_planets_userId_planetId_key" ON "user_favorite_planets"("userId", "planetId");

-- CreateIndex
CREATE UNIQUE INDEX "system_info_key_key" ON "system_info"("key");
