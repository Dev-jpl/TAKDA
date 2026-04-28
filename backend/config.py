# TAKDA Multi-Agent OS: Coordination Configuration
# Decouples Brand Identity (Aly, etc.) from Technical Infrastructure (Coordinator)

# System-level default only. Per-user name is stored in user_profiles.assistant_name
# and loaded into every agent request via node_load_context → state["assistant_name"].
ASSISTANT_NAME = "Aly"
