import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const url = 'https://www.jleague.jp/match/search/?category%5B%5D=100yj1&category%5B%5D=j2j3&category%5B%5D=j1&category%5B%5D=leaguecup&category%5B%5D=j2&category%5B%5D=j3&category%5B%5D=playoff&category%5B%5D=j2playoff&category%5B%5D=J3jflplayoff&category%5B%5D=emperor&category%5B%5D=acle&category%5B%5D=acl2&category%5B%5D=acl&category%5B%5D=fcwc&category%5B%5D=supercup&category%5B%5D=asiachallenge&category%5B%5D=jwc&club%5B%5D=yokohamafm&year=2025';

try {
  console.log('Fetching J-League official site...');
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  const html = await response.text();
  console.log(`Fetched ${html.length} bytes`);
  
  const $ = cheerio.load(html);
  
  // Find match cards
  const matchCards = $('a').filter((i, el) => {
    const text = $(el).text();
    return text.includes('試合終了') || text.includes('予定');
  });
  
  console.log(`Found ${matchCards.length} match cards`);
  
  // Extract first 5 matches
  matchCards.slice(0, 5).each((i, el) => {
    const text = $(el).text();
    console.log(`\nMatch ${i + 1}:`);
    console.log(text.substring(0, 200));
  });
  
} catch (error) {
  console.error('Error:', error.message);
}
