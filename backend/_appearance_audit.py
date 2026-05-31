import os, sys
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.dev"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import django; django.setup()

from data.seeds.ctet import ALL_QUESTIONS

# Find all 3-appearance questions
print("3-appearance questions:")
for i, q in enumerate(ALL_QUESTIONS):
    aps = q.get("appearances", [])
    if len(aps) == 3:
        print(f"  [{i}] {q['subject']} > {q['topic']}: \"{q['stem'][:50]}...\" appearances={aps}")

print("\n\n2-appearance questions:")
for i, q in enumerate(ALL_QUESTIONS):
    aps = q.get("appearances", [])
    if len(aps) == 2:
        print(f"  [{i}] {q['subject']} > {q['topic']}: \"{q['stem'][:50]}...\" appearances={aps}")
