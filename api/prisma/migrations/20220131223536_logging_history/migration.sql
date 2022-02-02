/*
  Warnings:

  - You are about to drop the column `lastSongPlayed` on the `music_settings` table. All the data in the column will be lost.
  - You are about to drop the column `nbOfSongsPlayed` on the `music_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "music_settings" DROP COLUMN "lastSongPlayed",
DROP COLUMN "nbOfSongsPlayed";

-- CreateTable
CREATE TABLE "music_logs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "requester" TEXT NOT NULL,
    "guildId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "music_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "music_logs" ADD CONSTRAINT "music_logs_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
