/* Cloud save settings.
   Leave both values empty to keep progress on the device only (the cloud-save card is hidden).
   To turn cloud save on, create a free Supabase project, run supabase.sql in its SQL editor,
   then paste the Project URL and the "anon public" API key below.
   The anon key is designed to be public: the database only allows the two save/load functions. */
window.BOLO_CLOUD = window.BOLO_CLOUD || {
  url: "",      // e.g. "https://abcdefghijkl.supabase.co"
  anonKey: ""   // the long "anon" / "public" key from Project Settings → API
};
