async function test() {
  try {
    // 1. login 
    const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@courtiq.com', password: 'demo123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("LOGIN RES: ", loginData.user.name);

    // 2. subscribe Basic
    const subRes = await fetch('http://localhost:3001/api/v1/pass/subscribe', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ tier: 'basic' })
    });
    const subData = await subRes.json();
    console.log("SUBSCRIBE RESPONSE:");
    console.dir(subData, {depth: null});

    // 3. fetch Me
    const meRes = await fetch('http://localhost:3001/api/v1/pass/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meRes.json();
    console.log("PASS/ME RESPONSE:");
    console.dir(meData, {depth: null});
  } catch (err) {
    console.error("ERROR:", err);
  }
}

test();
