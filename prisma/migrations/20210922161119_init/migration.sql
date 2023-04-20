-- CreateTable
CREATE TABLE "guilds" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blacklisted_channels" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "guildId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blacklisted_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "music_blacklisted_channels" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "guildId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "music_blacklisted_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "music_settings" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "volume" INTEGER NOT NULL DEFAULT 5,
    "lastSongPlayed" TEXT,
    "nbOfSongsPlayed" INTEGER,
    "guildId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "music_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guilds_guildId_key" ON "guilds"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "blacklisted_channels_channelId_key" ON "blacklisted_channels"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "music_blacklisted_channels_channelId_key" ON "music_blacklisted_channels"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "music_settings_channelId_key" ON "music_settings"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "music_settings_guildId_unique" ON "music_settings"("guildId");

-- AddForeignKey
ALTER TABLE "blacklisted_channels" ADD CONSTRAINT "blacklisted_channels_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "music_blacklisted_channels" ADD CONSTRAINT "music_blacklisted_channels_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "music_settings" ADD CONSTRAINT "music_settings_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
