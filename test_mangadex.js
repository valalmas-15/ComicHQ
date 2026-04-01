const MangaDex = require('./server/src/providers/mangadex');

async function testMangaDex() {
  console.log("🔍 Testing MangaDex Search...");
  try {
    const results = await MangaDex.search("Solo Leveling");
    console.log(`✅ Found ${results.length} results.`);
    if (results.length > 0) {
      console.log("First Result:", JSON.stringify(results[0], null, 2));
      const chapters = await MangaDex.getChapters(results[0].source_id);
      console.log(`✅ Found ${chapters.length} chapters.`);
      if (chapters.length > 0) {
        console.log("First Chapter:", JSON.stringify(chapters[0], null, 2));
        const pages = await MangaDex.getPages(chapters[0].id);
        console.log(`✅ Found ${pages.length} pages.`);
        if (pages.length > 0) {
          console.log("First Page URL:", pages[0]);
        }
      }
    }
  } catch (e) {
    console.error("❌ Test Failed:", e.message);
  }
}

testMangaDex();
