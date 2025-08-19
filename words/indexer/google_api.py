from pathlib import Path

GOOGLE_API_KEY = 'google-key.txt'
GOOGLE_API_URL = 'https://customsearch.googleapis.com/customsearch/v1'

async def google_api_search(session, word):
    key = Path(GOOGLE_API_KEY).read_text(encoding='utf-8').strip()
    params = {
        'key': key,
        'cx': '93b24b4dcb8474d77',
        'q': word,
        'searchType': 'image',
        'imageSize': 'huge',
        'num': 1
    }

    async with session.get(GOOGLE_API_URL, params = params) as resp:
        data = await resp.json()
        try:
            link = data['items'][0]['link']
            return link
        except (KeyError, IndexError):
            return None