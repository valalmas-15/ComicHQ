const asura = require('./src/providers/asurascans');
const komiku = require('./src/providers/komiku');
const westmanga = require('./src/providers/westmanga');

async function testProvider(provider, query) {
  console.log(`\n🔍 Testing ${provider.name}...`);
  try {
    const results = await provider.search(query);
    console.log(`✅ Search results found: ${results.length}`);
    if (results.length > 0) {
      const first = results[0];
      console.log(`📝 First result: ${first.title} (${first.source_id})`);
      
      console.log(`📖 Fetching chapters for: ${first.source_id}...`);
      const chapters = await provider.getChapters(first.source_id);
      console.log(`✅ Chapters found: ${chapters.length}`);
      
      if (chapters.length > 0) {
        const firstCh = chapters[0];
        console.log(`🆔 First chapter: "${firstCh.title}" (ID: ${firstCh.id})`);
      } else {
         console.warn(`❌ No chapters found for ${first.title}`);
      }
    } else {
      console.warn(`❌ No search results for "${query}" on ${provider.name}`);
    }
  } catch (err) {
    console.error(`❌ Error testing ${provider.name}:`, err.message);
  }
}

async function runTests() {
  await testProvider(asura, "Solo Leveling");
  await testProvider(komiku, "Hero");
  await testProvider(westmanga, "Solo Leveling");
}

runTests();
