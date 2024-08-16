import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";

interface AdItem {
  title: string;
  price: string;
  location: string;
  date: string;
  url: string;
  imageUrl: string;
  priceValue?: number;
}

async function fetchPage(
  url: string
): Promise<{ html: string; finalUrl: string }> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      maxRedirects: 5,
    });

    return { html: response.data, finalUrl: response.request.res.responseUrl };
  } catch (error) {
    console.error("Error fetching the page:", error);
    return { html: "", finalUrl: "" };
  }
}

function extractAds(html: string): AdItem[] {
  const $ = cheerio.load(html);
  const ads: AdItem[] = [];

  $(".ad-listitem").each((index, element) => {
    const $element = $(element);
    const title = $element.find(".ellipsis").text().trim();
    const price = $element
      .find(".aditem-main--middle--price-shipping--price")
      .text()
      .trim();

    if (title.includes("Zu verschenken") || price.includes("Zu verschenken")) {
      const ad: AdItem = {
        title,
        price,
        location: $element.find(".aditem-main--top--left").text().trim(),
        date: $element.find(".aditem-main--top--right").text().trim(),
        url:
          "https://www.kleinanzeigen.de" +
          $element.find("a.ellipsis").attr("href"),
        imageUrl: $element.find("img.lazyload").attr("data-src") || "",
      };

      ads.push(ad);
    }
  });

  return ads;
}

async function scrapeKleinanzeigenAds(): Promise<AdItem[]> {
  let allAds: AdItem[] = [];
  let pageNumber = 1;
  let hasMorePages = true;
  const scrapedUrls = new Set<string>();

  const site = url.split("https://")[1];
  const parts = site.split("/");
  const lastPart1 = parts.pop();
  const lastPart2 = parts.pop();

  while (hasMorePages) {
    let urlToScrape = `https://${parts.join(
      "/"
    )}/seite:${pageNumber}/${lastPart2}/${lastPart1}`;

    if (parts.length === 1) {
      urlToScrape = `https://${parts.join(
        "/"
      )}/${lastPart2}/seite:${pageNumber}/${lastPart1}`;
    }

    console.log(`Attempting to scrape page ${pageNumber}: ${urlToScrape}`);

    const { html, finalUrl } = await fetchPage(urlToScrape);

    if (scrapedUrls.has(finalUrl)) {
      console.log(`Reached a previously scraped URL. Stopping.`);
      hasMorePages = false;
      break;
    }

    scrapedUrls.add(finalUrl);

    if (html) {
      const ads = extractAds(html);
      if (ads.length) {
        fs.writeFileSync(
          `temp/adspage${pageNumber}.json`,
          JSON.stringify(ads, null, 2),
          "utf-8"
        );
        allAds = allAds.concat(ads);
      }
      pageNumber++;
    } else {
      console.log(`Failed to fetch page ${pageNumber}. Stopping.`);
      hasMorePages = false;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return allAds;
}

async function main() {
  const ads = await scrapeKleinanzeigenAds();
  fs.writeFileSync("ads.json", JSON.stringify(ads, null, 2), "utf-8");
  console.log(
    `Scraped ads written to ads.json, you have ${ads.length} freebies`
  );
}

// const url = `https://www.kleinanzeigen.de/s-seite:${pageNumber}/lagerregal/k0`;
// const url = `https://www.kleinanzeigen.de/s-muenchen/seite:${pageNumber}/regal/k0l6411`
// const url = `https://www.kleinanzeigen.de/s-bayern/seite:${pageNumber}/kellerregal/k0l5510`
// const getUrl = (pageNumber: number) =>
//   `https://www.kleinanzeigen.de/s-autos/muenchen/seite:${pageNumber}/auto/k0c216l6411`;
// const url = 'https://www.kleinanzeigen.de/s-bayern/hauptplatine/k0l5510'

const url = "https://www.kleinanzeigen.de/s-wolfsburg/l3071";

main();
