const axios = require('axios');
const cheerio = require('cheerio');

async function testDetail() {
  try {
    const { data } = await axios.get('https://softkomik.co/solo-leveling-bahasa-indonesia', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const nextMatch = data.match(/<script id=\"__NEXT_DATA__\"[^>]*>([^<]+)<\/script>/);
    if (nextMatch) {
      const json = JSON.parse(nextMatch[1]);
      const komik = json.props.pageProps.komik;
      console.log('Komik:', komik ? komik.title : 'None');
      const chapters = json.props.pageProps.chapters;
      console.log('Chapters count:', chapters ? chapters.length : 0);
      if (chapters && chapters.length > 0) {
        console.log('First chapter ID:', chapters[0].slug);
      }
    } else {
      console.log('__NEXT_DATA__ not found');
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}
testDetail();
