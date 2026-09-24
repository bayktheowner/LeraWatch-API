export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=UTF-8",
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: corsHeaders });

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "GET") {
      return json({ ok: false, error: "Метод не поддерживается" }, 405);
    }

    const url = new URL(request.url);

    if (url.pathname === "/") {
      return json({
        ok: true,
        app: "LeraWatch API",
        version: "0.6",
        endpoints: ["/search?q=...", "/watch?id=...&type=movie|tv&region=RU"],
      });
    }

    if (!env.TMDB_API_TOKEN) {
      return json({ ok: false, error: "TMDB_API_TOKEN is not configured" }, 500);
    }

    if (url.pathname === "/search") {
      const query = (url.searchParams.get("q") || "").trim();
      if (!query) return json({ ok: false, error: 'Не указан параметр "q"' }, 400);

      try {
        const tmdbUrl = new URL("https://api.themoviedb.org/3/search/multi");
        tmdbUrl.searchParams.set("query", query);
        tmdbUrl.searchParams.set("language", "ru-RU");
        tmdbUrl.searchParams.set("include_adult", "false");
        tmdbUrl.searchParams.set("page", "1");

        const response = await tmdbFetch(tmdbUrl, env);
        if (!response.ok) return tmdbError(response, json);

        const data = await response.json();
        const results = (data.results || [])
          .filter((item) => item.media_type === "movie" || item.media_type === "tv")
          .slice(0, 10)
          .map((item) => {
            const isMovie = item.media_type === "movie";
            return {
              id: item.id,
              type: item.media_type,
              title: (isMovie ? item.title : item.name) || item.original_title || item.original_name || "Без названия",
              originalTitle: item.original_title || item.original_name || "",
              year: ((isMovie ? item.release_date : item.first_air_date) || "").slice(0, 4),
              overview: item.overview || "",
              rating: typeof item.vote_average === "number" ? item.vote_average : null,
              poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            };
          });

        return json({ ok: true, query, count: results.length, results });
      } catch (error) {
        return json({ ok: false, error: "LeraWatch API error", details: errorMessage(error) }, 500);
      }
    }

    if (url.pathname === "/watch") {
      const id = (url.searchParams.get("id") || "").trim();
      const type = (url.searchParams.get("type") || "").trim().toLowerCase();
      const region = ((url.searchParams.get("region") || "RU").trim().toUpperCase());
      const title = (url.searchParams.get("title") || "").trim();

      if (!/^\d+$/.test(id)) {
        return json({ ok: false, error: 'Параметр "id" должен быть TMDB ID' }, 400);
      }
      if (type !== "movie" && type !== "tv") {
        return json({ ok: false, error: 'Параметр "type" должен быть movie или tv' }, 400);
      }
      if (!/^[A-Z]{2}$/.test(region)) {
        return json({ ok: false, error: 'Параметр "region" должен быть кодом страны, например RU' }, 400);
      }

      try {
        const tmdbUrl = new URL(`https://api.themoviedb.org/3/${type}/${id}/watch/providers`);
        const response = await tmdbFetch(tmdbUrl, env);
        if (!response.ok) return tmdbError(response, json);

        const data = await response.json();
        const country = data.results?.[region] || null;

        if (!country) {
          return json({
            ok: true,
            id: Number(id),
            type,
            region,
            available: false,
            link: null,
            providers: { flatrate: [], free: [], ads: [], rent: [], buy: [] },
            attribution: "JustWatch",
          });
        }

        const normalize = (items = []) =>
          items.map((p) => ({
            id: p.provider_id,
            name: p.provider_name,
            priority: p.display_priority ?? null,
            logo: p.logo_path ? `https://image.tmdb.org/t/p/w185${p.logo_path}` : null,
            url: providerUrl(p.provider_name, title, country.link || null),
          }));

        return json({
          ok: true,
          id: Number(id),
          type,
          region,
          available: true,
          link: country.link || null,
          providers: {
            flatrate: normalize(country.flatrate),
            free: normalize(country.free),
            ads: normalize(country.ads),
            rent: normalize(country.rent),
            buy: normalize(country.buy),
          },
          attribution: "JustWatch",
        });
      } catch (error) {
        return json({ ok: false, error: "LeraWatch API error", details: errorMessage(error) }, 500);
      }
    }

    return json({ ok: false, error: "Маршрут не найден" }, 404);
  },
};

function tmdbFetch(url, env) {
  return fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${env.TMDB_API_TOKEN}`,
      Accept: "application/json",
    },
  });
}

async function tmdbError(response, json) {
  const body = await response.text();
  return json({
    ok: false,
    error: "Ошибка запроса к TMDB",
    tmdbStatus: response.status,
    details: body.slice(0, 500),
  }, 502);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
\n\nfunction providerUrl(providerName, title, fallback) {\n  const name = String(providerName || "").toLowerCase();\n  const q = encodeURIComponent(title || "");\n\n  // Official provider search pages. If a title was not supplied, use the\n  // provider home page. Unknown providers safely fall back to JustWatch.\n  if (name.includes("okko")) {\n    return title ? `https://okko.tv/search?query=${q}` : "https://okko.tv/";\n  }\n  if (name.includes("amediateka") || name.includes("амедиатека")) {\n    return title ? `https://www.amediateka.ru/search?query=${q}` : "https://www.amediateka.ru/";\n  }\n  if (name.includes("tvigle")) {\n    return title ? `https://www.tvigle.ru/search/?q=${q}` : "https://www.tvigle.ru/";\n  }\n  if (name.includes("wink")) {\n    return title ? `https://wink.ru/search?query=${q}` : "https://wink.ru/";\n  }\n  if (name.includes("ivi")) {\n    return title ? `https://www.ivi.ru/search/?q=${q}` : "https://www.ivi.ru/";\n  }\n  if (name.includes("kinopoisk") || name.includes("кинопоиск")) {\n    return title ? `https://www.kinopoisk.ru/index.php?kp_query=${q}` : "https://www.kinopoisk.ru/";\n  }\n  if (name.includes("kion")) {\n    return "https://kion.ru/";\n  }\n  if (name.includes("premier")) {\n    return "https://premier.one/";\n  }\n  if (name.includes("start")) {\n    return "https://start.ru/";\n  }\n\n  return fallback;\n}\n