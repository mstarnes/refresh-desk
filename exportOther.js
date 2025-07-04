const fs = require('fs').promises;
const path = require('path');
const generateSchema = require('json-schema-generator');

// Configuration
const OUTPUT_DIR = './data';
const SCHEMA_DIR = './models';

// Endpoints with corresponding data and schema filenames (excluding /api/v2/apps)
const endpoints = [
//  { dataFilename: 'Tickets0.json', schemaFilename: 'Tickets.js' },
//  { dataFilename: 'Companies0.json', schemaFilename: 'Companies.js' },
//  { dataFilename: 'Agents0.json', schemaFilename: 'Agents.js' },
//  { dataFilename: 'Users0.json', schemaFilename: 'Users.js' },
//  { dataFilename: 'CannedResponses0.json', schemaFilename: 'CannedResponses.js' },
//  { dataFilename: 'Solutions0.json', schemaFilename: 'Solutions.js' },
//  { dataFilename: 'Groups0.json', schemaFilename: 'Groups.js' },
  { dataFilename: 'Roles0.json', schemaFilename: 'Roles.js' },
  { dataFilename: 'TimeEntries0.json', schemaFilename: 'TimeEntries.js' },
  { dataFilename: 'Skills0.json', schemaFilename: 'Skills.js' },
  { dataFilename: 'EmailConfigs0.json', schemaFilename: 'EmailConfigs.js' },
  { dataFilename: 'Products0.json', schemaFilename: 'Products.js' },
  { dataFilename: 'SLAPolicies0.json', schemaFilename: 'SLAPolicies.js' },
  { dataFilename: 'BusinessHours0.json', schemaFilename: 'BusinessHours.js' },
  { dataFilename: 'Surveys0.json', schemaFilename: 'Surveys.js' },
  { dataFilename: 'TicketFields0.json', schemaFilename: 'TicketFields.js' },
  { dataFilename: 'Automations0.json', schemaFilename: 'Automations.js' },
  { dataFilename: 'Settings0.json', schemaFilename: 'Settings.js' },
];

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.mkdir(SCHEMA_DIR, { recursive: true });
    console.log('Directories ensured:', OUTPUT_DIR, SCHEMA_DIR);
  } catch (error) {
    console.error('Error creating directories:', error.message);
    throw error;
  }
}

// Generate and save JSON schema if schema file doesn't exist
async function generateAndSaveSchema(data, dataFilename, schemaPath) {
  try {
    // Check if schema file already exists
    try {
      await fs.access(schemaPath);
      console.log(`Schema ${schemaPath} already exists, skipping.`);
      return;
    } catch {
      // Schema file doesn't exist, proceed to generate
    }

    const schema = generateSchema(data);
    // Set schema title based on schema filename (without .js)
    schema.title = path.basename(schemaPath, '.js');
    // Convert schema to a JS module
    const schemaContent = `module.exports = ${JSON.stringify(schema, null, 2)};\n`;
    await fs.writeFile(schemaPath, schemaContent);
    console.log(`Successfully saved schema: ${schemaPath} from ${dataFilename}`);
  } catch (error) {
    console.error(`Error generating schema for ${schemaPath}:`, error.message);
  }
}

// Process a data file to generate schema
async function processDataFile(endpoint) {
  try {
    const dataPath = path.join(OUTPUT_DIR, endpoint.dataFilename);
    const schemaPath = path.join(SCHEMA_DIR, endpoint.schemaFilename);

    // Read data file
    let data;
    try {
      const fileContent = await fs.readFile(dataPath, 'utf8');
      data = JSON.parse(fileContent);
    } catch (error) {
      console.error(`Error reading ${endpoint.dataFilename}:`, error.message);
      return;
    }

    // Generate and save schema
    await generateAndSaveSchema(data, endpoint.dataFilename, schemaPath);
  } catch (error) {
    console.error(`Error processing ${endpoint.dataFilename}:`, error.message);
  }
}

// Main function to process all data files
async function main() {
  try {
    await ensureDirectories();
    for (const endpoint of endpoints) {
      await processDataFile(endpoint);
    }
    console.log('All data files processed.');
  } catch (error) {
    console.error('Program failed:', error.message);
  }
}

// Run the program
main();