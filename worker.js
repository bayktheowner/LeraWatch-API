export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/") {
      return Response.json(
        { ok: true, app: "LeraWatch API", version: "0.3", message: "API is alive 💜" },
        { headers: corsHeaders }
      );
    }

    if (url.pathname === "/search") {
      const query = url.searchParams.get("q")?.trim();

      if (!query) {
        return Response.json(
          { ok: false, error: "Не указан параметр q" },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!env.TMDB_API_TOKEN) {
        return Response.json(
          { ok: false, error: "TMDB_API_TOKEN is not configured" },
          { status: 500, headers: corsHeaders }
        );
      }

      try {
        const tmdbUrl = new URL("https://api.themoviedb.org/3/search/multi");
        tmdbUrl.searchParams.set("query", query);
        tmdbUrl.searchParams.set("language", "ru-RU");
        tmdbUrl.searchParams.set("include_adult", "false");

        const response = await fetch(tmdbUrl.toString(), {
          headers: {
            Authorization: `Bearer ${env.TMDB_API_TOKEN}`,
            accept: "application/json",
          },
        });

        if (!response.ok) {
          const body = await response.text();
          return Response.json(
            { ok: false, error: "TMDB request failed", status: response.status, details: body },
            { status: 502, headers: corsHeaders }
          );
        }

        const data = await response.json();
        const results = data.results
          .filter(item => item.media_type === "movie" || item.media_type === "tv")
          .slice(0, 10)
          .map(item => ({
            id: item.id,
            type: item.media_type,
            title: item.title || item.name || "Без названия",
            originalTitle: item.original_title || item.original_name || "",
            year: (item.release_date || item.first_air_date || "").slice(0, 4),
            overview: item.overview || "",
            rating: item.vote_average || null,
            poster: item.poster_path
              ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
              : null,
          }));

        return Response.json(
          { ok: true, query, count: results.length, results },
          { headers: corsHeaders }
        );
      } catch (error) {
        return Response.json(
          { ok: false, error: "LeraWatch API error", details: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return Response.json(
      { ok: false, error: "Маршрут не найден" },
      { status: 404, headers: corsHeaders }
    );
  },
};
