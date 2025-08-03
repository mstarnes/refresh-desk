// freshdesk_export.js
// Node.js script to export major resources from Freshdesk API.
// Requires: Node.js v14+, axios, and environment variables FRESHDESK_DOMAIN and FRESHDESK_API_KEY.
// Usage: FRESHDESK_DOMAIN=yourdomain FRESHDESK_API_KEY=yourkey node freshdesk_export.js
// Exports data to a timestamped directory like exports_2025-07-29T12:00:00.000Z/
// Note: This exports main resource lists with pagination handling via Link headers.
// For tickets, includes additional details via ?include=description,requester,stats.
// Full nested data (e.g., conversations per ticket) is not fetched to avoid rate limit issues;
// if needed, extend the script to fetch per-ticket details separately.
// Rate limits apply based on your plan; add delays if necessary.

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
//const dotenv = require('dotenv');
require('dotenv').config();

//dotenv.config({ path: path.resolve(__dirname, '.env') });
//console.log(__dirname);
//console.log(JSON.stringify(dotenv));
console.log('FRESHDESK_DOMAIN:', process.env.FRESHDESK_DOMAIN);

const domain = process.env.FRESHDESK_DOMAIN;
const apiKey = process.env.FRESHDESK_API_KEY;

if (!domain || !apiKey) {
  console.error('Missing FRESHDESK_DOMAIN or FRESHDESK_API_KEY environment variables.');
  process.exit(1);
}

const baseUrl = `https://${domain}.freshdesk.com/api/v2/`;
const auth = Buffer.from(`${apiKey}:X`).toString('base64');

axios.defaults.headers.common['Authorization'] = `Basic ${auth}`;
axios.defaults.headers.common['Content-Type'] = 'application/json';

async function fetchAll(endpoint) {
  let url = `${baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100`;
  if( endpoint === 'account' ) {
      url = `${baseUrl}${endpoint}`;
  }
  if( endpoint === 'tickets' ) {
      url = `${baseUrl}${endpoint}`;
  }
  console.warn('Endpoint URL: ' + url);
  let allData = [];
  while (url) {
    try {
      const response = await axios.get(url);
      allData.push(...response.data);
      const linkHeader = response.headers.link;
      if (!linkHeader) break;
      const nextLinkMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      url = nextLinkMatch ? nextLinkMatch[1] : null;
    } catch (error) {
      console.error(`Error fetching ${url}:`, error.message);
      break;
    }
  }
  return allData;
}

async function main() {
  const timestamp = new Date().toISOString();
  const exportDir = path.join('./backups/', `freshdesk_export_${timestamp}`);
  console.log(exportDir);
  await fs.mkdir(exportDir, { recursive: true });

  const resources = [
  //  { name: 'tickets', endpoint: 'tickets?include=description,requester,stats' },
    { name: 'tickets', endpoint: 'tickets' },
    
    /*
    { name: 'contacts', endpoint: 'contacts' },
    { name: 'agents', endpoint: 'agents' },
    { name: 'roles', endpoint: 'roles' },
    { name: 'groups', endpoint: 'groups' },
    { name: 'companies', endpoint: 'companies' },
    { name: 'products', endpoint: 'products' },
    { name: 'time_entries', endpoint: 'time_entries' },
    { name: 'satisfaction_ratings', endpoint: 'satisfaction_ratings' },
    { name: 'surveys', endpoint: 'surveys' },
    { name: 'business_hours', endpoint: 'business_hours' },
    { name: 'email_configs', endpoint: 'email_configs' },
    { name: 'email_mailboxes', endpoint: 'email/mailboxes' },
    { name: 'solution_categories', endpoint: 'solutions/categories' },
    { name: 'solution_folders', endpoint: 'solutions/folders' },
    { name: 'solution_articles', endpoint: 'solutions/articles' },
    { name: 'skills', endpoint: 'skills' },
    { name: 'sla_policies', endpoint: 'sla_policies' },
    { name: 'automations', endpoint: 'automations' },
    { name: 'canned_responses', endpoint: 'canned_responses' },
    { name: 'scenarios', endpoint: 'scenarios' },
    { name: 'discussions_categories', endpoint: 'discussions/categories' },
    { name: 'discussions_forums', endpoint: 'discussions/forums' },
    { name: 'discussions_topics', endpoint: 'discussions/topics' },
    { name: 'ticket_fields', endpoint: 'ticket_fields' },
    { name: 'contact_fields', endpoint: 'contact_fields' },
    { name: 'company_fields', endpoint: 'company_fields' },
    { name: 'jobs', endpoint: 'jobs' },
    { name: 'account', endpoint: 'account' }
     */
  ];

  for (const resource of resources) {
    console.log(`Fetching ${resource.name}...`);
    console.log(resource.endpoint);
    const data = await fetchAll(resource.endpoint);
    const filePath = path.join(exportDir, `${resource.name}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Saved ${resource.name} to ${filePath} (${data.length} items)`);
  }

  console.log('Export complete.');
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});