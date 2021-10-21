-- CreateTable
CREATE TABLE "moms_logs" (
    "id" SERIAL NOT NULL,
    "userIdDiscord" TEXT NOT NULL,
    "didStartTheme" BOOLEAN NOT NULL,
    "guildId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "moms_logs_guildId_key" ON "moms_logs"("guildId");

-- AddForeignKey
ALTER TABLE "moms_logs" ADD CONSTRAINT "moms_logs_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "music_settings_guildId_unique" RENAME TO "music_settings_guildId_key";
