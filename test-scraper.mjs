import { scrapeAllMatches } from './server/scraper.ts';

console.log('Starting scraper test...');
const result = await scrapeAllMatches();
console.log('Result:', JSON.stringify(result, null, 2));
