const axios = require('./server/node_modules/axios');

async function testRemixData() {
  const url = "https://westmanga.tv/comic/solo-leveling?_data=routes%2Fcomic.%24slug";
  console.log(`📡 Fetching Remix Data: ${url}`);
  try {
    const { data } = await axios.get(url, {
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    });
    console.log("📄 Remix Data found! Preview:", JSON.stringify(data).substring(0, 1000));
  } catch (e) {
    console.error("❌ Failed Remix Guess:", e.message);
  }
}

testRemixData();
