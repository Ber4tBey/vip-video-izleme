const { resolveStreamtapeDirectUrl } = require('./backend/utils/streamtape.js');

async function test() {
  try {
    const url = 'https://streamtape.com/v/Z0x4WYd6WeSqqG3/';
    const directUrl = await resolveStreamtapeDirectUrl(url);
    console.log('Direct URL:', directUrl);

    // Let's try downloading the first few bytes
    const https = require('https');
    
    const req = https.request(directUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
        'Referer': url
      }
    }, (res) => {
      console.log('Status:', res.statusCode);
      console.log('Headers:', res.headers);
      res.on('data', (d) => {
        console.log('Got data!', d.length, 'bytes');
        req.destroy();
      });
    });
    
    req.on('error', (e) => {
      console.error('Request error:', e.message);
    });
    
    req.end();

  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
