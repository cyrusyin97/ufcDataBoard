"""Extract image candidates from saved athlete HTML. This command has no network access."""
import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

ALLOWED_HOSTS = {"www.ufc.com", "ufc.com"}


def public_url(value, page_url):
    if not value:
        return None
    url = urljoin(page_url, value)
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except ValueError:
        return None
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
        return None
    if parsed.username or parsed.password or port not in (None, 443):
        return None
    return url


class AthletePage(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.images = []
        self.metadata = []
        self.anchors = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "a":
            self.anchors.append(attrs.get("href"))
        if tag == "img":
            attrs["_athlete_href"] = self.anchors[-1] if self.anchors else None
            self.images.append(attrs)
        if tag == "meta" and attrs.get("property", attrs.get("name")) in (
            "og:image", "twitter:image"
        ):
            self.metadata.append(attrs.get("content"))

    def handle_endtag(self, tag):
        if tag == "a" and self.anchors:
            self.anchors.pop()


def extract_candidates(body, page_url):
    page = AthletePage()
    page.feed(body)
    candidates = []
    observed = set()

    def add(url, role, method, review_required=False):
        url = public_url(url, page_url)
        if not url or (url, role) in observed:
            return
        observed.add((url, role))
        candidates.append({
            "url": url, "role": role, "method": method,
            "reviewRequired": review_required, "pageUrl": page_url,
        })

    for image in page.images:
        classes = image.get("class", "").split()
        url = next((public_url(image.get(key), page_url) for key in ("src", "data-src")
                    if public_url(image.get(key), page_url)), None)
        if not url:
            choices = image.get('srcset') or image.get('data-srcset') or ''
            source_choices = [part.strip().split()[0] for part in choices.split(',') if part.strip()]
            url = next((public_url(value, page_url) for value in source_choices if public_url(value, page_url)), None)
        if "hero-profile__image" in classes:
            add(url, "half_body", "hero_image")
            if url:
                parsed = urlsplit(url)
                match = re.fullmatch(r"/images/styles/[^/]+/s3/(.+)", parsed.path)
                if match:
                    original = urlunsplit((parsed.scheme, parsed.netloc,
                                           "/images/" + match.group(1), "", ""))
                    add(original, "full_body_candidate", "derived_hero_path", True)
        owner = public_url(image.get("_athlete_href"), page_url)
        owned = owner and urlsplit(owner).path.rstrip("/") == urlsplit(page_url).path.rstrip("/")
        if url and owned and "event_results_athlete_headshot" in url:
            add(url, "headshot_candidate", "event_image", True)
    for url in page.metadata:
        add(url, "headshot_candidate", "social_metadata", True)
    return candidates


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("html", type=Path)
    parser.add_argument("--page-url", required=True)
    args = parser.parse_args()
    if not public_url(args.page_url, args.page_url):
        parser.error("The page URL must use an approved HTTPS host.")
    print(json.dumps(extract_candidates(args.html.read_text(), args.page_url), indent=2))


if __name__ == "__main__":
    main()
