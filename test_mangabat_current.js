const mangabat = require('./server/src/providers/mangabat.js');

async function test() {
  console.log("Searching for 'Solo Leveling' in Mangabat...");
  try {
    const results = await mangabat.search("Solo Leveling");
    console.log(`Found ${results.length} results.`);
    if (results.length > 0) {
      console.log("First result:", results[0]);
      
      console.log("\nGetting chapters for:", results[0].source_id);
      const chapters = await mangabat.getChapters(results[0].source_id);
      console.log(`Found ${chapters.length} chapters.`);
      
      if (chapters.length > 0) {
        console.log("First chapter:", chapters[0]);
        console.log("\nGetting pages for:", chapters[0].id);
        const pages = await mangabat.getPages(chapters[0].id);
        console.log(`Found ${pages.length} pages.`);
      }
    }
  } catch (e) {
    console.error("Test failed:", e.message);
  }
}

test();
