const Westmanga = require('./server/src/providers/westmanga');

async function testSearch() {
  console.log("🔍 Testing Westmanga Search...");
  try {
    const results = await Westmanga.search("solo leveling");
    console.log(`✅ Found ${results.length} results.`);
    if (results.length > 0) {
      console.log("First Result:", JSON.stringify(results[0], null, 2));
    }
  } catch (e) {
    console.error("❌ Search Failed:", e.message);
  }

  console.log("\n📑 Testing Westmanga Chapters...");
  try {
    // Test with the slug
    const chapters = await Westmanga.getChapters("solo-leveling");
    console.log(`✅ Found ${chapters.length} chapters.`);
    if (chapters.length > 0) {
      console.log("First Chapter:", JSON.stringify(chapters[0], null, 2));
    }
  } catch (e) {
    console.error("❌ Chapters Failed:", e.message);
  }
}

testSearch();
