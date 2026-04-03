const axios = require("axios");
const cheerio = require("cheerio");
const BaseProvider = require("./baseProvider");

class GenericWPProvider extends BaseProvider {
  constructor(name, baseUrl, selectors) {
    super(name, baseUrl);
    this.selectors = selectors;
    this.mirrors = [];
  }

  async search(query) {
    const mirrors =
      this.mirrors && this.mirrors.length > 0 ? this.mirrors : [this.baseUrl];
    const searchPaths = this.selectors.searchPath
      ? [this.selectors.searchPath]
      : ["/browse?search=", "/contents?q=", "/?s=", "/search?q="];

    for (const mirror of mirrors) {
      for (const searchPath of searchPaths) {
        try {
          const queryStr = this.selectors.queryReplacer ? encodeURIComponent(query).replace(new RegExp(this.selectors.queryReplacer[0], 'g'), this.selectors.queryReplacer[1]) : encodeURIComponent(query);
          const url = `${mirror.replace(/\/$/, '')}/${searchPath.replace(/^\//, '')}${queryStr}`;

          console.log(`📡 [${this.name}] Searching: ${url}`);
          const { data, status } = await axios.get(url, {
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
              'Referer': mirror,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
              'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'same-origin',
              'Sec-Fetch-User': '?1',
              'Upgrade-Insecure-Requests': '1',
              'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 10000
          });

          let finalData = data;
          
          // REMIX/REACT ROUTER DATA BYPASS: If we get a shell with no items, try direct _data route
          if (!data.includes(this.selectors.title || 'font-medium') && url.includes('westmanga.tv')) {
            try {
               const dataUrl = `${url}&_data=routes%2F_public.contents%2Findex`;
               console.log(`📡 [${this.name}] Attempting Remix Data Bypass: ${dataUrl}`);
               const dataRes = await axios.get(dataUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } });
               if (dataRes.data && dataRes.data.results) {
                  // If we get JSON, transform it to mock HTML items for Cheerio compatibility
                  // Or return results directly if we want to be fancy.
                  // For now, let's stick to HTML if possible, or handle JSON.
               }
            } catch (e) {}
          }

          const $ = cheerio.load(finalData);
          const items = $(
            this.selectors.item ||
              '.listupd .bs, .utao .uta, .c-tabs-item__content, .manga-item, .series-card, .grid > a, div[data-slot="card"]',
          );

          if (items.length > 0) {
            console.log(
              `🔍 [${this.name}] Found ${items.length} items on ${url}`,
            );

            return items
              .map((i, el) => {
                const a = $(el)
                  .find(this.selectors.link || "a")
                  .first();
                if (!a.length) return null;

                let href = a.attr("href");
                if (!href) return null;
                if (href.startsWith("/") && !href.startsWith("//"))
                  href = new URL(mirror).origin + href;

                const titleContent =
                  $(el)
                    .find(
                      this.selectors.title ||
                        ".tt, h3, h4, .title, .post-title, .font-medium",
                    )
                    .first()
                    .text()
                    .trim() ||
                  a.attr("title") ||
                  a.text().trim();
                const title = titleContent
                  ? titleContent.replace(/\s+/g, " ")
                  : "";

                const img = $(el)
                  .find(this.selectors.image || "img")
                  .first();
                let thumbnail =
                  img.attr("src") ||
                  img.attr("data-src") ||
                  img.attr("data-lazy-src") ||
                  img.attr("data-cfsrc");
                if (
                  thumbnail &&
                  thumbnail.startsWith("/") &&
                  !thumbnail.startsWith("//")
                )
                  thumbnail = new URL(mirror).origin + thumbnail;

                return {
                  title,
                  source_id: href,
                  thumbnail,
                  provider: this.name,
                  type: "manhwa",
                  latest_chapter: "New",
                };
              })
              .get()
              .filter(Boolean);
          }
        } catch (error) {
          // Silent fail for mirror/path trials
        }
      }
    }
    return [];
  }

  async getChapters(mangaUrl) {
    let slugs = [];
    if (!mangaUrl.startsWith("http")) {
      slugs = [mangaUrl];
    } else {
      try {
        const urlObj = new URL(mangaUrl);
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        slugs = [pathParts[pathParts.length - 1]];
      } catch (e) {}
    }

    const mirrors =
      this.mirrors && this.mirrors.length > 0 ? this.mirrors : [this.baseUrl];

    for (const mirror of mirrors) {
      try {
        let currentUrl = mangaUrl;
        if (!mangaUrl.startsWith("http")) {
          currentUrl = `${mirror.replace(/\/$/, "")}/manga/${slugs[0]}/`;
          if (this.name.toLowerCase().includes("west"))
            currentUrl = `${mirror.replace(/\/$/, "")}/comic/${slugs[0]}/`;
          if (this.name.toLowerCase().includes("asura"))
            currentUrl = `${mirror.replace(/\/$/, "")}/comics/${slugs[0]}/`;
        } else {
          const oldHost = new URL(mangaUrl).hostname;
          const newHost = new URL(mirror).hostname;
          currentUrl = mangaUrl.replace(oldHost, newHost);
        }

        if (!currentUrl.endsWith("/")) currentUrl += "/";

        console.log(`📡 [${this.name}] Fetching chapters: ${currentUrl}`);
        const { data } = await axios.get(currentUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            Referer: mirror,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
            "Sec-Ch-Ua":
              '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
          },
          timeout: 15000,
        });

        const $ = cheerio.load(data);
        const itemSelectors = [
          '.divide-y a[href*="/chapter/"]',
          'div[data-slot="card"] a[href*="/view/"]',
          ".cl-item",
          ".eplister li",
          "#chapterlist li",
          ".listing-chapters_item",
          "li.wp-manga-chapter",
          ".ch-item",
          ".chapter-list li",
          "tr#Daftar_Chapter",
        ];

        let items = $();
        for (const sel of itemSelectors) {
          let found = $(sel);
          if (found.length > 0) {
            items = found;
            break;
          }
        }

        const chapters = items
          .map((i, el) => {
            const a = $(el).attr("href") ? $(el) : $(el).find("a").first();
            if (!a.length || !a.attr("href")) return null;

            let title =
              $(el).find(".font-medium").first().text().trim() ||
              $(el).find("p").first().text().trim() ||
              $(el).find(".chapternum, .chapter-title").first().text().trim() ||
              a.text().trim().replace(/\s+/g, " ");

            let date =
              $(el)
                .find(".text-muted-foreground, .chapterdate, .text-xs.font-medium, .text-right")
                .last()
                .text()
                .trim() ||
              $(el).find("p").last().text().trim() ||
              $(el).find("span").last().text().trim() ||
              "N/A";

            return {
              id: a.attr("href").startsWith("http")
                ? a.attr("href")
                : `${new URL(currentUrl).origin}${a.attr("href")}`,
              title: title || `Chapter ${items.length - i}`,
              updated_at: date,
            };
          })
          .get()
          .filter(Boolean);

        if (chapters.length > 0) {
          console.log(
            `✅ [${this.name}] Success: ${chapters.length} chapters.`,
          );
          return chapters;
        }
      } catch (error) {
        console.error(
          `⚠️ [${this.name}] Chapter Mirror ${mirror} failed:`,
          error.message,
        );
      }
    }
    return [];
  }

  async getPages(chapterUrl) {
    try {
      console.log(`📡 [${this.name}] Pages from: ${chapterUrl}`);
      const { data } = await axios.get(chapterUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          Referer: this.baseUrl,
          "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        },
      });
      const $ = cheerio.load(data);
      let pages = [];
      const scripts = $("script")
        .map((i, el) => $(el).html())
        .get();
      const readerScript = scripts.find(
        (s) => s && s.includes("ts_reader.run("),
      );

      if (readerScript) {
        try {
          const jsonStr = readerScript.substring(
            readerScript.indexOf("{"),
            readerScript.lastIndexOf("}") + 1,
          );
          const config = JSON.parse(jsonStr);
          if (config.sources?.[0]?.images) pages = config.sources[0].images;
        } catch (e) {}
      }

      if (pages.length === 0) {
        const imageSelectors =
          '#readerarea img, .main-reading-area img, .entry-content img, div[data-slot="canvas"] img, .flex-col.items-center.mb-4 img, img[alt^="Page "]';
        pages = $(imageSelectors)
          .map((i, el) => {
            return (
              $(el).attr("src") ||
              $(el).attr("data-src") ||
              $(el).attr("data-lazy-src") ||
              $(el).attr("data-srcset")
            );
          })
          .get()
          .filter(
            (img) =>
              img &&
              !["banner", "logo", "ads"].some((s) =>
                img.toLowerCase().includes(s),
              ),
          )
          .map((img) =>
            img.startsWith("//")
              ? "https:" + img
              : img.startsWith("/")
                ? new URL(chapterUrl).origin + img
                : img,
          )
          .filter((img) => img.startsWith("http"));
      }
      return pages;
    } catch (error) {
      console.error(`❌ [${this.name}] Pages Error:`, error.message);
      return [];
    }
  }
}

module.exports = GenericWPProvider;
