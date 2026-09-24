LeraWatch API v0.6 — Clickable Providers

Залить worker.js в API GitHub-репозиторий.
Cloudflare secret TMDB_API_TOKEN не менять.

/watch теперь принимает title и возвращает url для площадки.
Для известных сервисов используется официальный сайт/поиск сервиса.
Для неизвестных сервисов fallback — title-specific ссылка JustWatch от TMDB.
