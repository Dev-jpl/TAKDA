import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

res = supabase.table("module_definitions").select("slug, schema").execute()
for row in res.data:
    print(f"Slug: {row['slug']}")
    print(f"Schema: {row['schema']}")
    print("-" * 20)
