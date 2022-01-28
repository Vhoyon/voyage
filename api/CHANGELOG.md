# Changelog

## [0.5.0](https://github.com/Vhoyon/voyage/compare/voyage-discord-bot-v0.4.0...voyage-discord-bot-v0.5.0) (2022-01-28)


### Features

* update licence to 2022 ([27c370b](https://github.com/Vhoyon/voyage/commit/27c370b714c39c9b50e88165d540863e00c3d933))


### Bug Fixes

* better DX by inferring interaction button keys ([c7c173f](https://github.com/Vhoyon/voyage/commit/c7c173fc157a776b8dd9b9c9110ab910ee20fa01))

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
