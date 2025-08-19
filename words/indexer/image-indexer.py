import aiohttp
import asyncio
import json
import sys
from pathlib import Path
from wikipedia_api import wikipedia_api_search
from google_scraper import scrape_images_async

async def main(input_file, output_file):
    # load wordList
    wordList = Path(input_file).read_text(encoding='utf-8').splitlines()
    
    try:
        with open(output_file, 'r', encoding='utf-8') as file:
            existing_json = json.load(file)
    except FileNotFoundError:
        existing_json = {}

    for (word, img) in existing_json.items():
         if word in wordList:
            wordList.remove(word)

    results = {}
    async with aiohttp.ClientSession() as session:
        
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