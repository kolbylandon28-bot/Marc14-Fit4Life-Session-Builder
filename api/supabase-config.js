module.exports = function supabaseConfig(request, response) {
  const url = process.env.SUPABASE_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.STORAGE_URL
    || process.env.STORAGE_SUPABASE_URL
    || process.env.STORAGE_NEXT_PUBLIC_SUPABASE_URL
    || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.STORAGE_PUBLISHABLE_KEY
    || process.env.STORAGE_SUPABASE_PUBLISHABLE_KEY
    || process.env.STORAGE_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.STORAGE_ANON_KEY
    || process.env.STORAGE_SUPABASE_ANON_KEY
    || process.env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY
    || "";

  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (!url || !key) {
    return response.status(503).json({
      configured: false,
      message: "Supabase environment variables are not connected to this Vercel project."
    });
  }

  return response.status(200).json({ configured: true, url, key });
};
