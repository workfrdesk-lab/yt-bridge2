
// @ts-ignore
import { tiktokdl } from 'tiktok-dl';

async function test() {
  try {
    const data = await tiktokdl('https://www.tiktok.com/@arthurjesus.ia/video/7661037207586884885');
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}
test();
