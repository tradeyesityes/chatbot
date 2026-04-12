const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const baseUrl = process.env.VITE_EVOLUTION_BASE_URL;
const globalKey = process.env.VITE_EVOLUTION_GLOBAL_API_KEY;

async function main() {
    try {
        console.log('--- Fetching Instances ---');
        const res = await axios.get(`${baseUrl}/instance/fetchInstances`, {
            headers: { 'apikey': globalKey }
        });
        
        let instances = res.data;
        if (!Array.isArray(instances)) {
             // Some versions return an object with instances array
             instances = instances.instances || [];
        }
        
        console.log(`Found ${instances.length} instances.`);
        
        for (const inst of instances) {
            const name = inst.instanceName || inst.name;
            const status = inst.status || inst.connectionStatus;
            console.log(`\nInstance: ${name} (Status: ${status})`);
            
            if (!name) {
                console.log('Instance structure:', JSON.stringify(inst, null, 2));
                continue;
            }

            // Check webhook
            try {
                const webhookRes = await axios.get(`${baseUrl}/webhook/find/${name}`, {
                    headers: { 'apikey': globalKey }
                });
                console.log('Webhook Config:', JSON.stringify(webhookRes.data, null, 2));
            } catch (e) {
                console.log('Error fetching webhook:', e.response?.data || e.message);
            }
        }
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}
main();
