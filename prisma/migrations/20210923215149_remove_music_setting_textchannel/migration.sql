/*
  Warnings:

  - You are about to drop the column `channelId` on the `music_settings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "music_settings_channelId_key";

-- AlterTable
ALTER TABLE "music_settings" DROP COLUMN "channelId";
