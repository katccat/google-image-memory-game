import aiohttp

WIKIPEDIA_URL = 'https://en.wikipedia.org/w/api.php'
MAX_TITLES = 50

async def wikipedia_api_search(session, word):
	params = {
		'action': 'query',
		'prop': 'pageimages',
		'piprop': 'thumbnail',
		'pithumbsize': 800,
		'pilicense': 'any',
		'titles': word,
		'format': 'json',
		'formatversion': 2
	}

	async with session.get(WIKIPEDIA_URL, params = params) as resp:
		data = await resp.json()
		try:
			page = data['query']['pages'][0]
			if 'thumbnail' in page:
				return page['thumbnail']['source']
		except (KeyError, IndexError):
			return None

import aiohttp

async def wikipedia_batch_search(words):
    """
    Query Wikipedia in chunks of MAX_TITLES.
    Returns a dict: {word: image_url or None}
    """
    results = {w: None for w in words}  # pre-fill with None

    async with aiohttp.ClientSession() as session:
        # chunk the words list
        for i in range(0, len(words), MAX_TITLES):
            chunk = words[i:i+MAX_TITLES]
            titles = "|".join(chunk)
            params = {
                "action": "query",
                "prop": "pageimages",
                "piprop": "thumbnail",
                "pithumbsize": 800,
                "pilicense": "any",
                "titles": titles,
                "format": "json",
                "formatversion": 2
            }

            try:
                async with session.get(WIKIPEDIA_URL, params=params) as resp:
                    if resp.status != 200:
                        print(f"Wikipedia batch failed ({resp.status}).")
                        continue

                    try:
                        data = await resp.json()
                    except aiohttp.ContentTypeError:
                        print("Wikipedia batch returned non-JSON.")
                        continue

                    for page in data.get("query", {}).get("pages", []):
                        title = page.get("title")
                        thumb = page.get("thumbnail", {}).get("source")
                        if title in results:
                            results[title] = thumb
            except Exception as e:
                print(f"Error in Wikipedia batch: {e}")

    return results

