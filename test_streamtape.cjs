const { resolveStreamtapeDirectUrl } = require('./backend/utils/streamtape.js');

async function test() {
  try {
    const url = 'https://streamtape.com/v/Z0x4WYd6WeSqqG3/';
    const directUrl = await resolveStreamtapeDirectUrl(url);
    console.log('Direct URL:', directUrl);

    // Let's try downloading the first few bytes with the same User-Agent
    const https = require('https');
    
    const req = https.request(directUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
        'Referer': url
      }
    }, (res) => {
      console.log('Valid UA Status:', res.statusCode);
      res.on('data', (d) => {
        console.log('Valid UA Got data!', d.length, 'bytes');
        res.destroy(); // Only read one chunk to avoid downloading whole file
      });
      res.on('end', () => console.log('End of stream'));
    });
    
    req.on('error', (e) => {
      console.error('Valid UA Request error:', e.message);
    });
    req.end();

    // Small delay before second request
    await new Promise(r => setTimeout(r, 2000));

    // Let's try downloading with a different client User-Agent
    const reqDiff = https.request(directUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Referer': url
      }
    }, (res) => {
      console.log('Different UA Status:', res.statusCode);
      res.on('data', (d) => {
        console.log('Different UA Got data!', d.length, 'bytes');
        res.destroy();
      });
    });
    
    reqDiff.on('error', (e) => {
      console.error('Different UA Request error:', e.message);
    });
    reqDiff.end();

  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
