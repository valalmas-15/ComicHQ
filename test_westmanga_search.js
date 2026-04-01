const Westmanga = require('./server/src/providers/westmanga');
const axios = require('./server/node_modules/axios');

async function testWestmanga() {
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
}

testWestmanga();
