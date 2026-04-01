const axios = require('axios');
const cheerio = require('cheerio');

async function testCombo() {
  const query = 'solo';
  const apiUrl = `https://komiku.org/wp-json/wp/v2/search?search=${query}&subtype=manga&per_page=5`;
  
  try {
     const { data: apiResults } = await axios.get(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
     console.log('API Found:', apiResults.length, 'Results');
     
     for (const item of apiResults) {
        // Switch to .id mirror for detail fetching
        const idUrl = item.url.replace('komiku.org', 'komiku.id').replace('secure.komikid.org', 'komiku.id');
        console.log('Fetching detail from:', idUrl);
        
        try {
           const { data: html } = await axios.get(idUrl, { 
             headers: { 'User-Agent': 'Mozilla/5.0' }, 
             timeout: 5000 
           });
           const $ = cheerio.load(html);
           const thumb = $('.ims img').attr('src') || $('.bgei img').attr('src') || $('.post-item img').first().attr('src');
           console.log('Title extracted:', $('.judul h1').text().trim());
           console.log('Thumb extracted:', thumb);
           if (thumb) break; // Found one!
        } catch (e) {
           console.log('Detail Fetch Error:', e.message);
        }
     }
  } catch (e) {
     console.log('API Error:', e.message);
  }
}
testCombo();
