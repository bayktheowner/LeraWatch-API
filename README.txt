LeraWatch API v0.6.1 FIX

Replace ONLY worker.js in the existing API GitHub repository.
Do not change wrangler.jsonc or TMDB_API_TOKEN.

Fixes:
- valid JavaScript (v0.6 archive accidentally contained escaped newline characters before providerUrl)
- /watch now fetches the title from TMDB automatically
- each provider contains a url field
- response contains apiVersion: 0.6.1

Test after Cloudflare deploy:
/watch?id=1399&type=tv
Expected: apiVersion 0.6.1 and url inside Okko/Amediateka/TvIgLe provider objects.
