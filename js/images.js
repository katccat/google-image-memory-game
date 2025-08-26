/*
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
*/
export async function getGoogleImg(term) {
	const url = `https://www.google.com/search?q=${encodeURIComponent(
		term + " -drawing -illustration -logo -clipart -cartoon -icon -vector -ai"
	)}&hl=en&tbm=isch`;

	const headers = {
		"User-Agent":
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
			"AppleWebKit/537.36 (KHTML, like Gecko) " +
			"Chrome/49.0.2623.87 Safari/537.36",
	};

	const response = await fetch(url, { headers });
	const html = await response.text();

	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");

	const imgAttrs = [];
	const imgs = doc.querySelectorAll("img");

	imgs.forEach((img) => {
		const attrs = img.attributes;
		if (attrs.length >= 3) {
			imgAttrs.push([attrs[2].name, attrs[2].value]);
		}
	});

	try {
		return imgAttrs[1][1];
	} catch {
		return null;
	}
}