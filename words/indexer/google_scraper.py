from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import asyncio

async def scrape_images_async(query, num_images=1, headless=True):
    return await asyncio.to_thread(scrape_images, query, num_images, headless)

def scrape_images(query, num_images=1, headless=True):
    """Scrape image URLs from Google Images for a given query."""

    # Configure Chrome options
    options = webdriver.ChromeOptions()
    if headless:
        options.add_argument("--headless=new")  # new headless mode

    # Start ChromeDriver in a portable way (no need for a preinstalled chromedriver)
    driver = webdriver.Chrome(
        options=options
    )

    try:
        # Create a Google Images search URL
        search_url = f"https://www.google.com/search?q={query}&tbm=isch"
        driver.get(search_url)

        # Scroll to load enough images
        for _ in range(num_images // 50):
            driver.execute_script("window.scrollBy(0,10000)")

        # Wait until at least one image is visible
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.wIjY0d.jFk0f img.YQ4gaf"))
        )

        # Grab image elements
        img_elements = driver.find_elements(By.CSS_SELECTOR, "div.wIjY0d.jFk0f img.YQ4gaf")

        results = []
        for i, img_element in enumerate(img_elements[:num_images]):
            try:
                img_element.click()
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, 'img.sFlh5c.FyHeAf.iPVvYb'))
                )
                img_url_element = driver.find_element(By.CSS_SELECTOR, 'img.sFlh5c.FyHeAf.iPVvYb')
                img_url = img_url_element.get_attribute("src")
                results.append(img_url)
            except Exception as e:
                print(f"Failed to download image {i+1}: {e}")
                results.append(None)

        return results

    finally:
        driver.quit()  # always close the browser
