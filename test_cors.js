async function testCors() {
  try {
    const res = await fetch("https://streamtape.com/v/Z0x4WYd6WeSqqG3/", {
      method: "GET",
      headers: {
        "Origin": "http://localhost:5173",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36"
      }
    });

    console.log("Status:", res.status);
    console.log("CORS Headers:");
    console.log("Access-Control-Allow-Origin:", res.headers.get("access-control-allow-origin"));
    
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

testCors();
