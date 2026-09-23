// Do not put a service_role key here.
// These two values are safe to expose in a static app when RLS is correctly configured.
window.SUPERHUMAN_CONFIG = {
  SUPABASE_URL: localStorage.getItem("aora_supabase_url") || "",
  SUPABASE_ANON_KEY: localStorage.getItem("aora_supabase_anon_key") || "",
  GROQ_API_KEY: localStorage.getItem("aora_groq_key") || "",
  GROQ_MODEL: localStorage.getItem("aora_groq_model") || "openai/gpt-oss-120b",
  GROQ_VISION_MODEL: localStorage.getItem("aora_groq_vision_model") || "meta-llama/llama-4-scout-17b-16e-instruct"
};
