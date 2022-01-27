# Changelog

## [0.5.0](https://www.github.com/Vhoyon/voyage/compare/v0.4.0...v0.5.0) (2022-01-27)


### Features

* **discord-nestjs:** Update to v2 and general improvements ([#30](https://www.github.com/Vhoyon/voyage/issues/30)) ([b526976](https://www.github.com/Vhoyon/voyage/commit/b526976fb525b756a9145bde90c8c3b2b124928e))
* **MomsMusic:** add logic to play music on timed-out joins ([#16](https://www.github.com/Vhoyon/voyage/issues/16)) ([7776d66](https://www.github.com/Vhoyon/voyage/commit/7776d6680844c1f5365f8733a5e7ed9e2193a0b6))
* **MomsMusic:** probability of annoying theme when nico joins ([13cbeb8](https://www.github.com/Vhoyon/voyage/commit/13cbeb8de9dc14403b919673269abe93fa25b18e))
* **music:** add dynamic player ([#12](https://www.github.com/Vhoyon/voyage/issues/12)) ([83c5017](https://www.github.com/Vhoyon/voyage/commit/83c5017780e70d73dbf801dcdf825009e9d3c207))


### Bug Fixes

* disable YOUTUBE_API_KEY env var checks as it is useless now ([eef5ea4](https://www.github.com/Vhoyon/voyage/commit/eef5ea47780d5845ad862033a3410d858a5eccf8))
* **discord-music-player:** backward imcompatible change to leave vc ([03d507c](https://www.github.com/Vhoyon/voyage/commit/03d507c87f2820cfac06e8122d71caa388fb6fd4))
* **InteractionsGateway:** voice channel guard is inverted ([2def4a8](https://www.github.com/Vhoyon/voyage/commit/2def4a85ca556380abfd51584b832c1ca9db0e32))
* **MessageService:** add error looging to sendEmbed ([c99c48b](https://www.github.com/Vhoyon/voyage/commit/c99c48bab416c88b593985962a13a8e4c7df2041))
* **MessageService:** better typing for edit method ([c9605a6](https://www.github.com/Vhoyon/voyage/commit/c9605a6cc3568588e81c2b888df5ff7b0e535e4c))
* **MessageService:** better typing for replace method ([936b791](https://www.github.com/Vhoyon/voyage/commit/936b7919beaaffe2e0bbec5e2540ace40890703a))
* **MessageService:** edit not updating components ([7984e2f](https://www.github.com/Vhoyon/voyage/commit/7984e2f8763a864f7a1f1725f18cd33477837361))
* **MessageService:** potential reply failure to interactions ([27610cc](https://www.github.com/Vhoyon/voyage/commit/27610cce8c6d0a0d1a48f0a2e6bba540d30841af))
* **MessageService:** remove uneeded `get` call ([355f79d](https://www.github.com/Vhoyon/voyage/commit/355f79da906516939ffebb35a9450f3fbf24802d))
* **MomsMusic:** cannot create multiple logs because of unique guildId ([295a3ea](https://www.github.com/Vhoyon/voyage/commit/295a3eab7096847b02c74175f3e9ebb4a70a03d1))
* **MomsMusic:** set proper francois theme song ([592fe3b](https://www.github.com/Vhoyon/voyage/commit/592fe3b6ad52b8287ea1b53eaea601cc4a698295))
* **MusicGuard:** remove now useless type condition ([d10f5b7](https://www.github.com/Vhoyon/voyage/commit/d10f5b71a69f8d5f52488f80f952a5f7f60e16b9))
* **music:** looping is now a toggle ([376ee42](https://www.github.com/Vhoyon/voyage/commit/376ee42b97681dd2e692120407811e4a3c6c3d65))
* node engine version set to ^16 instead of >= 16 ([97f7645](https://www.github.com/Vhoyon/voyage/commit/97f76450b34e25b954e75770c4807a3bbe19f1f4))
* **play:** give textChannel context to queue when playing song ([d3d553d](https://www.github.com/Vhoyon/voyage/commit/d3d553d76420bea0bbeddb16439b563e8b31701b))
* possible update wrong settings if undefined guild ([77b8ad2](https://www.github.com/Vhoyon/voyage/commit/77b8ad2d406d16dac3718768ac4bc1fa39b1e164))
* prevent interactions from members not in voice channel ([f587e9a](https://www.github.com/Vhoyon/voyage/commit/f587e9a829179812b861f236935f8f31eada5a3c))
* unused import ([2e35c1d](https://www.github.com/Vhoyon/voyage/commit/2e35c1d0fe760f476e58ff1c96213a415ecfc8cb))


### Documentation

* **MessageService:** fix timeout jsdoc from ms to seconds ([5fbe029](https://www.github.com/Vhoyon/voyage/commit/5fbe02928f2c1f286c595406f249c8f7fddaa0b8))
* **MomsMusic:** fix typo in jdoc ([bf6d97c](https://www.github.com/Vhoyon/voyage/commit/bf6d97ca20af1ac41642419647f47df433518993))


### Performance

* **MusicGuard:** use prisma.count to check if channel is blacklisted ([36228a6](https://www.github.com/Vhoyon/voyage/commit/36228a6308924920c25023e59c26e3fd6667462a))


### Refactors

* **ButtonInteractionWithIdGuard:** inline condition ([f9c0902](https://www.github.com/Vhoyon/voyage/commit/f9c090253d9566206d48c8f50484225373e584d6))
* config gateway is now a controller ([7a9f157](https://www.github.com/Vhoyon/voyage/commit/7a9f1577a283cb46cd7001470c517a50e7ead53e))
* **IsInVoiceChannelGuard:** new guard to check if in voice channel ([b2620e0](https://www.github.com/Vhoyon/voyage/commit/b2620e080683fc18e2629d6aac57d01e4209152f))
* **MessageService:** allow errors of type unknown and better types ([596f551](https://www.github.com/Vhoyon/voyage/commit/596f551e488e002488b61fc194e867bb7c79e5ab))
* **MessageService:** remove redundant context arg in replace method ([da6cbc9](https://www.github.com/Vhoyon/voyage/commit/da6cbc953776b528fbe7db3076bf4e02c48d7b24))
* **MessageService:** replace method now accept an options object ([9cfc72e](https://www.github.com/Vhoyon/voyage/commit/9cfc72e8bd68cd86e89a5816dca3a795cc43974d))
* move music constants to constants folder ([2aa2704](https://www.github.com/Vhoyon/voyage/commit/2aa27046d790987f8c8663b55e60d69f68b13f7f))
* move play method logic to PlayerService ([674f2a4](https://www.github.com/Vhoyon/voyage/commit/674f2a465df985bb93d6d1411a441c3c71ec9bd8))
* move play music logic to PlayerService ([4d3791b](https://www.github.com/Vhoyon/voyage/commit/4d3791b8fcbcf335fcb26bed967434b1cf005bd9))
* **music:** move discord player logic to PlayerService ([dcd9d39](https://www.github.com/Vhoyon/voyage/commit/dcd9d39d89c3024ab8ed6421c44a7acb88f61dde))
* **music:** play method now has callbacks on key moments ([36c116e](https://www.github.com/Vhoyon/voyage/commit/36c116e7707afbf20a2f5d4a81c4d0c1ff0e1c06))
* **MusicService:** add util getChannelContext method ([123e19d](https://www.github.com/Vhoyon/voyage/commit/123e19db501b80e3e2e6a5428034f3086598052d))
* **MusicService:** move play logic to own methods ([c25839e](https://www.github.com/Vhoyon/voyage/commit/c25839e7eb6bacb4a8a5c2215ed96a2cd2b33b32))
* **PermissionGuard:** create new permission guards ([21900c9](https://www.github.com/Vhoyon/voyage/commit/21900c962d2e688f35b6d7ac29ea1a17c223fb31))
* **PlayerService:** create PlayerModule that exports PlayerService ([723da5a](https://www.github.com/Vhoyon/voyage/commit/723da5a5523be085e6e965517d4edb3a7442a33b))
* **PlayerService:** switch play options to data options ([07aa6ae](https://www.github.com/Vhoyon/voyage/commit/07aa6ae33b5454d519d57685847f10fd7e662fec))
* rename PlayerGateway to InteractionsGateway ([6c7d746](https://www.github.com/Vhoyon/voyage/commit/6c7d746fc811dffee89225ee9b16652c22ff0abf))
* rename PromiseLike type to Promiseable ([8b35992](https://www.github.com/Vhoyon/voyage/commit/8b35992dde94f12b4505095c3a0229a9029234df))


### Miscellaneous

* delete unused .npmrc file ([d67e053](https://www.github.com/Vhoyon/voyage/commit/d67e053df06c9f45e21cbae8697a9e949a6e9af7))
* **discord.js:** update to v13.3.1 and fix incompatibilities issues ([fe91b71](https://www.github.com/Vhoyon/voyage/commit/fe91b71cade5e2856171a1d709c664c4d7a1c08c))
* **eslint:** add number 24 to ignore list for time based numbers ([76b8a32](https://www.github.com/Vhoyon/voyage/commit/76b8a3200dd21678dcbd809da1b01173f286f607))
* **eslint:** ignore magic numbers in enums ([1a86611](https://www.github.com/Vhoyon/voyage/commit/1a86611490b3be7c7e78341d4503d1e13bbfc5ad))
* implement upstream changes ([68f7b2d](https://www.github.com/Vhoyon/voyage/commit/68f7b2d4e8895b3ba779762c16ed3497e383b0cd))
* merge upstream changes ([dcfd0f2](https://www.github.com/Vhoyon/voyage/commit/dcfd0f2622c7822d6b2f73ba62cec55b297e876e))
* **MessageService:** force return type on sendRaw method ([ced571d](https://www.github.com/Vhoyon/voyage/commit/ced571df555dd1878e4480281ada6ef54998b53c))
* move ConfigModule import directly in imports array ([bcfde40](https://www.github.com/Vhoyon/voyage/commit/bcfde40490a3829e4aa8f21d0b4e8ff9d04752fc))
* **renovate:** move to shared config ([7bb2c26](https://www.github.com/Vhoyon/voyage/commit/7bb2c265e803b5e7129eeee3f4e762d54745adc6))
* tweak player types to force QueueData ([8ff5bcd](https://www.github.com/Vhoyon/voyage/commit/8ff5bcd609b72d0b1dfdc8844d664afd31ad99bd))


### Continuous Integration

* hide dependencies section ([cad4564](https://www.github.com/Vhoyon/voyage/commit/cad4564c8b7320e9fbd6f30d8235bd12dda3373a))
* install using ci instead of install ([3850878](https://www.github.com/Vhoyon/voyage/commit/3850878b3a0e12ca430c64933be857a918f31aa1))

## [0.4.0](https://www.github.com/Vhoyon/voyage/compare/v0.3.0...v0.4.0) (2021-10-08)


### Features

* **music:** add player button interactions ([#8](https://www.github.com/Vhoyon/voyage/issues/8)) ([42ac4b9](https://www.github.com/Vhoyon/voyage/commit/42ac4b9a07be30efbb3cac0a754ab425a7470dd7))


### Bug Fixes

* **music:** set play command field to show volume ([7d34f7a](https://www.github.com/Vhoyon/voyage/commit/7d34f7afcb165faa9ee185f38667a3655413a8da))


### Refactors

* add const for viewing queue song count ([3605466](https://www.github.com/Vhoyon/voyage/commit/36054665bc904617a70f4747fffe7f857af14c2b))
* allow message service to define MessageOptions ([b2b5d76](https://www.github.com/Vhoyon/voyage/commit/b2b5d761f8e278d0162d8c2bf78536e1f5986c27))
* message.service's replaceEmbed now uses context ([19b7ed6](https://www.github.com/Vhoyon/voyage/commit/19b7ed621f568a42c1c719a0cde784420c57fb5c))
* **MessageService:** (replace|edit)Embed => (replace|edit) ([34cc1cc](https://www.github.com/Vhoyon/voyage/commit/34cc1cccc9fb521be8bd4343aa0b35b13f3b91a6))
* **MessageService:** add inform error handling and few tweaks ([90a2559](https://www.github.com/Vhoyon/voyage/commit/90a25593e390f74f0039889ae18908c450316f3f))
* music service now accepts context params instead of message ([f14b79d](https://www.github.com/Vhoyon/voyage/commit/f14b79d3f3e3ea904b1e02fbb460fd169db697c9))
* **music:** services now return data instead of sending messages ([63409e5](https://www.github.com/Vhoyon/voyage/commit/63409e54871eabff9923b7b06e74aeceddb41bce))


### Miscellaneous

* tweak renovate to properly use semantic commits ([ec88dfa](https://www.github.com/Vhoyon/voyage/commit/ec88dfa3b60419e6c1c4ed7ef7820c675bfae73e))
* update renovate config to add schema ([94f6df3](https://www.github.com/Vhoyon/voyage/commit/94f6df3ecb1b1f29bbff28fcf6313eafb7f34170))

## [0.3.0](https://www.github.com/Vhoyon/voyage/compare/v0.2.2...v0.3.0) (2021-10-05)


### Features

* **music:** add now playing command (np) ([#3](https://www.github.com/Vhoyon/voyage/issues/3)) ([24331a3](https://www.github.com/Vhoyon/voyage/commit/24331a384767d50635af0624b9397f5fe785a19c))


### Bug Fixes

* **music:** send message if player error is 410 ([9db9a45](https://www.github.com/Vhoyon/voyage/commit/9db9a455f3557baaa6744b3109c3b098ef1813dc))
* **music:** skipping a song in a playlist sends many skipped messages ([a7d0f82](https://www.github.com/Vhoyon/voyage/commit/a7d0f82d11618297ef8d3c8a7602da36e2a3753b))


### Reverts

* ci: hide dependencies section ([aee0530](https://www.github.com/Vhoyon/voyage/commit/aee053032758c9a326ebe4b3405819b2a4548c98))


### Dependencies

* **renovate:** Pin dependencies ([d69ddf5](https://www.github.com/Vhoyon/voyage/commit/d69ddf532037a310c981e5a042635f8ce12c9c81))
* **renovate:** Update dependency @nestjs/graphql to v9.0.5 ([c0b49ac](https://www.github.com/Vhoyon/voyage/commit/c0b49ac9c9b309059b8e22a194b506e393e40520))
* **renovate:** Update dependency @types/jest to v27.0.2 ([1cc3d1e](https://www.github.com/Vhoyon/voyage/commit/1cc3d1edd35d9da0ca0beb349c0425b9c27fff9c))
* **renovate:** Update dependency jest to v27.2.4 ([3e1521b](https://www.github.com/Vhoyon/voyage/commit/3e1521bbf48c3898f17c284d93716a550cdb5a43))
* **renovate:** Update dependency prettier to v2.4.1 ([d0ffea3](https://www.github.com/Vhoyon/voyage/commit/d0ffea3d487338274bfc2edcef1d8e0586739606))
* **renovate:** Update dependency rxjs to v7.3.1 ([f83e962](https://www.github.com/Vhoyon/voyage/commit/f83e962daca874efc23021ef8f1e00b2fd3251cb))


### Continuous Integration

* hide dependencies section ([47e38f8](https://www.github.com/Vhoyon/voyage/commit/47e38f86d2c61b5ffb33f9db15ddaf85b7bfc745))
* remove PR's test suite as it is already done by coverage job ([fae48b3](https://www.github.com/Vhoyon/voyage/commit/fae48b3187e04f205e6ab242f23f1799bc019ad4))
* tweak categories titles and add Reverts category ([4a4ea33](https://www.github.com/Vhoyon/voyage/commit/4a4ea3361e955f086c7b0b9d3ed11c9c29092a36))


### Refactors

* add message service to send formatted messages or errors ([#6](https://www.github.com/Vhoyon/voyage/issues/6)) ([30f721a](https://www.github.com/Vhoyon/voyage/commit/30f721a2627201180543412429e7dcfe517c2a4f))


### Miscellaneous

* add CODEOWNERS file ([3471627](https://www.github.com/Vhoyon/voyage/commit/34716272eb8890633c30ca68c17951d08c6829dd))
* implement upstream changes ([5b8268a](https://www.github.com/Vhoyon/voyage/commit/5b8268a9f1e1ac4c7bd3fe48add9e2fed9b661f8))
* move common configs files to own folder ([167967c](https://www.github.com/Vhoyon/voyage/commit/167967c28f7e68f4011606817418ac6a43c2fbbf))
* update package-lock.json with proper github url ([4d2c575](https://www.github.com/Vhoyon/voyage/commit/4d2c575a52b67bd333192dee050e26816a58de32))
