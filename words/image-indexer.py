import aiohttp
import asyncio
import json
import sys
from pathlib import Path
import html
from html.parser import HTMLParser
from google_scraper import scrape_images_async

WIKIPEDIA_URL = 'https://en.wikipedia.org/w/api.php'
GOOGLE_URL = 'https://customsearch.googleapis.com/customsearch/v1'
GOOGLE_KEY = 'google-key.txt'

img_attrs = [] #global so that HTMLParser can write to it, get_google_img can read from it
class HTMLParser(html.parser.HTMLParser): #override `html.parser.HTMLParser` with our own class `HTMLParser`, so we can overwrite the handle_starttag() method
	def handle_starttag(self, tag, attrs): # whenever an opening tag is found (eg. <img>, <p>, etc.), it will trigger this built-in method of `..HTMLParser`. We are overwriting it so that on each trigger, it will write the attributes of the image tag to img_attr[]
		if tag == "img":
			try:
				img_attrs.append(attrs[2])
			except:
				return

async def get_google_img(session, term):
    global img_attrs
    img_attrs = []
    url = f'https://www.google.com/search?q={term + ' wikipedia -drawing -illustration -logo -clipart -cartoon -icon -vector -ai'}&hl=en&tbm=isch'
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/49.0.2623.87 Safari/537.36'
        )
    }

    async with session.get(url, headers=headers) as resp:
        html = await resp.text()

    parser = HTMLParser()
    parser.feed(html)
    try:
        return img_attrs[1][1]
    except Exception:
        return None

async def google_api_search(session, word):
    key = Path(GOOGLE_KEY).read_text(encoding='utf-8').strip()
    params = {
        'key': key,
        'cx': '93b24b4dcb8474d77',
        'q': word,
        'searchType': 'image',
        'imageSize': 'huge',
        'num': 1
    }

    async with session.get(GOOGLE_URL, params = params) as resp:
        data = await resp.json()
        try:
            link = data['items'][0]['link']
            return link
        except (KeyError, IndexError):
            return None

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


async def main(input_file, output_file):
    # load wordList
    wordList = Path(input_file).read_text(encoding='utf-8').splitlines()
    results = {}
    
    try:
        with open(output_file, 'r', encoding='utf-8') as file:
            targetFile = json.load(file)
    except FileNotFoundError:
        targetFile = {}

    for (word, img) in targetFile.items():
         if word in wordList:
              results[word] = img

    async with aiohttp.ClientSession() as session:

        #print(await google_api_search(session, 'cat'))
        for word in wordList:
            if word in results:
                 continue
            img = await wikipedia_api_search(session, word)
            if img is None:
                img_urls = await scrape_images_async(word)
                if img_urls and img_urls[0]:
                    img = img_urls[0].split('?')[0]
                else:
                    img = None
            if img:
                results[word] = img
                print(f'"{word}": "{img}"')

    # save as JSON
    with open(output_file, 'w', encoding='utf-8') as file:
        json.dump(results, file, indent=2, ensure_ascii=False)


if __name__ == '__main__':
    asyncio.run(main(sys.argv[1], sys.argv[2]))