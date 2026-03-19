#!/usr/bin/env python3

import json

INPUT_FILE  = "./images.json"
OUTPUT_FILE = "./images-new.json"

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    old = json.load(f)

trends = {
    term: { "url": entry["url"], "url2": None, "rank": None, "provider": None }
    for term, entry in old.items()
}

output = {
    "fetchedDate": None,
    "length": len(trends),
    "trends": trends,
}

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2)

print(f"✓ Converted {output['length']} entries")