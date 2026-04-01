const axios = require('axios');
const cheerio = require('cheerio');

async function testDetail() {
  const url = 'https://komiku.org/manga/solo-leveling-id/';
  try {
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    console.log('--- Komiku Detail ---');
    console.log('Title:', $('.judul h1').text().trim());
    console.log('Image:', $('.ims img').attr('src'));
    console.log('Chapters:', $('#Daftar_Chapter tr').length);
    console.log('Chapter 1 href:', $('.judulseries a').first().attr('href'));
  } catch (e) {
    console.log('Error:', e.message);
  }
}
testDetail();
