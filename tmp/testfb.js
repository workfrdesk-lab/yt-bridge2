const fs = require('fs');

async function testFbEmbed() {
  const videoUrl = "https://www.facebook.com/watch/?v=10158312028678217";
  const url = "https://www.facebook.com/plugins/video.php?href=" + encodeURIComponent(videoUrl);
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } });
  const html = await res.text();
  const matches = html.match(/https?:\\\/\\\/[^\s"'\\]+?fbcdn\.net[^\s"'\\]+/g);
  if (matches) {
    const clean = matches.map(u => u.replace(/\\/g, '').replace(/&amp;/g, '&')).filter(u => u.includes('.mp4'));
    console.log("Found mp4 count:", clean.length);
    if (clean.length > 0) {
      console.log("Sample URL:", clean[0]);
    }
  } else {
    console.log("No match");
  }
}
testFbEmbed();
