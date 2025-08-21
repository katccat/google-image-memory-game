from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def create_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")  # new headless mode

    # Start ChromeDriver in a portable way (no need for a preinstalled chromedriver)
    return webdriver.Chrome(options = options)

async def scrape_images(driver, query, num_images):
    """Scrape image URLs from Google Images for a given query."""

    # Create a Google Images search URL
    search_url = f"https://www.google.com/search?q={query + " -amazon - wikipedia"}&tbm=isch"
    driver.get(search_url)

    # Scroll to load enough images
    for _ in range(num_images // 50):
        driver.execute_script("window.scrollBy(0,10000)")

    # Wait until at least one image is visible
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.wIjY0d.jFk0f img.YQ4gaf"))
    )

    # Grab image elements
    results = []
    for i in range(num_images):
        print(f"attempt {i+1}")
        try:
            img_element = driver.find_elements(By.CSS_SELECTOR, "div.wIjY0d.jFk0f img.YQ4gaf")[i]
            img_element.click()
            WebDriverWait(driver, 1).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'img.sFlh5c.FyHeAf.iPVvYb'))
            )
            img_url_element = driver.find_element(By.CSS_SELECTOR, 'img.sFlh5c.FyHeAf.iPVvYb')
            img_url = img_url_element.get_attribute("src")
            results.append(img_url)
        except Exception as e:
            print(f"Failed to download image {i+1}")
            results.append(None)

    return results
