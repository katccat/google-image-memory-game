WIKIPEDIA_URL = 'https://en.wikipedia.org/w/api.php'

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

async def wikipedia_batch_search(session, words):
    params = {
        'action': 'query',
        'prop': 'pageimages',
        'piprop': 'thumbnail',
        'pithumbsize': 800,
        'pilicense': 'any',
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