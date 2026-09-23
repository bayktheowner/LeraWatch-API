# LeraWatch API v0.3

Cloudflare Worker backend for LeraWatch.

## Required secret

Create a Cloudflare Worker secret named:

`TMDB_API_TOKEN`

Use the TMDB API Read Access Token as its value.

Do not commit the token to GitHub.

## Endpoints

- `/` — health check
- `/search?q=Атака Титанов` — search TMDB
