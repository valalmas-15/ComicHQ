const ikiru = require('./src/providers/ikiru');

async function testProvider() {
  const chapterUrl = 'https://02.ikiru.wtf/manga/solo-leveling/chapter-179.269588/';
  console.log(`Testing Ikiru getPages("${chapterUrl}")...`);
  const pages = await ikiru.getPages(chapterUrl);
  
  if (pages && pages.length > 0) {
      console.log(`Success! Found ${pages.length} pages.`);
      console.log(pages.slice(0, 3));
  } else {
      console.log("Failed. No pages returned.");
  }
}

testProvider();
