const mangabat = require('./server/src/providers/mangabat.js');
const ikiru = require('./server/src/providers/ikiru.js');

async function test() {
  const query = "one piece";
  console.log(`Searching for "${query}" on Mangabat...`);
  const mangabatResults = await mangabat.search(query);
  console.log("Mangabat Results:", JSON.stringify(mangabatResults, null, 2));

  console.log(`\nSearching for "${query}" on Ikiru...`);
  const ikiruResults = await ikiru.search(query);
  console.log("Ikiru Results:", JSON.stringify(ikiruResults, null, 2));
}

test();
