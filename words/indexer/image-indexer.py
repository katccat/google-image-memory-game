import aiohttp
import asyncio
import json
import sys
from pathlib import Path
from wikipedia_api import wikipedia_api_search
from wikipedia_api import wikipedia_batch_search
from google_scraper import scrape_images
from google_scraper import create_driver

async def main():
    retry_mode = False
    rejected_json = '../rejected.json'
    word_file = '../word-lists/dogs.txt'
    output_file = 'output.json'
    # load wordList
    #wordList = Path(rejected_json).read_text(encoding='utf-8').splitlines()
    wordList = []
    rejectedImages = {}

    try:
        with open(rejected_json, 'r', encoding='utf-8') as file:
            input_json = json.load(file)
            if (retry_mode):
                wordList = input_json['retry']
            else:
                wordList = Path(word_file).read_text(encoding='utf-8').splitlines()
            rejectedImages = input_json['rejectedImages']
    except FileNotFoundError:
        sys.exit(1)

    results = {}
    wikipediaResults = await wikipedia_batch_search(wordList)
    for word in wikipediaResults:
        url = wikipediaResults.get(word)
        rejected_urls = rejectedImages.get(word, {}).get('url', [])
        if url is not None and url not in rejected_urls:
            results[word] = {"url": url, "whitelisted": False}
    chromeDriver = create_driver()
    try:
        for word in wordList:
            print(word)
            for result in results:
                print(result.lower())
                if result.lower() == word:
                    print(f"skipped {word} because in results")
                    continue
            
            img_urls = await scrape_images(driver = chromeDriver, query = word, num_images = 3)
            if img_urls:
                for url in img_urls:
                    if url:
                        filtered = url.split('?')[0]
                        rejected_urls = rejectedImages.get(word, {}).get("url", [])
                        if filtered not in rejected_urls:
                            results[word] = {}
                            results[word]['url'] = filtered
                            results[word]['whitelisted'] = False
                            print(f'"{word}": "{filtered}"')
                            break
                    else:
                        print(f"Invalid image for {word}")
    finally:
        chromeDriver.quit()

    # save as JSON
    with open(output_file, 'w', encoding='utf-8') as file:
        json.dump(results, file, indent=2, ensure_ascii=False)


if __name__ == '__main__':
    #asyncio.run(main(sys.argv[1], sys.argv[2]))
    asyncio.run(main())