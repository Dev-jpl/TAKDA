import os
from supabase import create_client

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')
s = create_client(url, key)

# Try to list tables using a query to information_schema
try:
    res = s.postgrest.rpc('get_tables').execute()
    print(f"RPC get_tables: {res.data}")
except:
    print("RPC get_tables failed")

# Try to check existence of suspected tables
tables = ['food_logs', 'expenses', 'module_entries', 'module_definitions', 'hubs', 'spaces']
for t in tables:
    try:
        s.table(t).select('count', count='exact').limit(0).execute()
        print(f"Table '{t}' exists")
    except Exception as e:
        print(f"Table '{t}' NOT found or error: {e}")
