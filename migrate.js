const { Client } = require('pg');
const dns = require('dns');
require('dotenv').config();

const ref = process.env.SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)[1];

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

// Try more regions and both ports
const regions = ['us-east-1','us-east-2','us-west-1','us-west-2','eu-west-1','eu-west-2','eu-central-1','ap-southeast-1','ap-southeast-2','ap-northeast-1'];
const configs = [
  // Direct connection with IPv4
  {
    host: `db.${ref}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.SUPABASE_SERVICE_KEY,
    ssl: { rejectUnauthorized: false },
    family: 4
  }
];

// Add pooler configs for all regions
for (const region of regions) {
  for (const port of [5432, 6543]) {
    configs.push({
      host: `aws-0-${region}.pooler.supabase.com`,
      port,
      database: 'postgres',
      user: `postgres.${ref}`,
      password: process.env.SUPABASE_SERVICE_KEY,
      ssl: { rejectUnauthorized: false }
    });
  }
}

async function tryConnect() {
  for (const config of configs) {
    const client = new Client(config);
    try {
      await Promise.race([
        client.connect(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
      ]);
      console.log(`Connected via ${config.host}:${config.port}!`);
      const res = await client.query('SELECT 1');
      await client.end();
      return config;
    } catch (e) {
      console.log(`${config.host}:${config.port} → ${e.message.substring(0,60)}`);
      try { await client.end(); } catch {}
    }
  }
  return null;
}

tryConnect().then(c => {
  if (c) console.log('\nFound working config:', JSON.stringify({host:c.host,port:c.port,user:c.user}));
  else console.log('\nNone worked');
});
