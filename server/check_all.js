const { providers } = require('./src/providers/index');
const axios = require('axios');
const agent = new (require('https').Agent)({ rejectUnauthorized: false });

async function runTest() {
    const query = "one piece";
    const status = {};

    for (const [name, provider] of Object.entries(providers)) {
        console.log(`Checking [${name}]...`);
        try {
            const results = await provider.search(query);
            if (results && results.length > 0) {
                status[name] = { working: true, count: results.length, first: results[0].title };
            } else {
                status[name] = { working: false, error: "No results found" };
            }
        } catch (e) {
            status[name] = { working: false, error: e.message };
        }
    }

    console.log('\n--- PROVIDER STATUS REPORT ---');
    console.table(Object.entries(status).map(([name, data]) => ({
        Provider: name,
        Working: data.working ? "✅" : "❌",
        Info: data.working ? `Found ${data.count} items` : data.error
    })));
}

runTest();
