const Asura = require('./server/src/providers/asurascans');
const axios = require('./server/node_modules/axios');

async function testAsura() {
  console.log("🔍 Testing Asura Search...");
  try {
    const results = await Asura.search("solo leveling");
    console.log(`✅ Found ${results.length} results.`);
    if (results.length > 0) {
      console.log("First Result:", JSON.stringify(results[0], null, 2));
    }
  } catch (e) {
    console.error("❌ Search Failed:", e.message);
  }
}

testAsura();
