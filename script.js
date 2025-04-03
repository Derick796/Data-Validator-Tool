const fs = require ('fs');
const xml2js = require('xml2js');
const path = require('path');

// File paths
const inputFile = './inputData.xml';
const outputFile = './processedData.json';
const backupDir = './backup/';
const finalDir = './finalData/';

// Ensure necessary directories exist
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir);

// Function to validate XML data
function validateData(data) {
    if (!data.customer || !data.customer.name || !data.customer.accountNumber) {
        throw new Error('Required fields are missing!');
    }
    return true;
}

// Function to process the XML file
function processXML(inputPath) {
    fs.readFile(inputPath, 'utf8', (err, data) => {
        if (err) return console.error('Error reading file:', err);

        const parser = new xml2js.Parser();
        parser.parseString(data, (err, result) => {
            if (err) return console.error('Error parsing XML:', err);

            // Validate the parsed data
            try {
                validateData(result.customer);
                console.log('✅ Data validated successfully.');

                // Write validated data to JSON
                fs.writeFile(outputFile, JSON.stringify(result, null, 2), (err) => {
                    if (err) return console.error('Error writing JSON:', err);
                    console.log('✅ Data saved to processedData.json');

                    // Rename & Move Processed File
                    const newFileName = path.join(finalDir, 'processedData.json');
                    fs.rename(outputFile, newFileName, (err) => {
                        if (err) return console.error('Error moving file:', err);
                        console.log('✅ File moved to finalData directory');
                    });
                });

                // Backup the original XML file
                fs.copyFile(inputPath, path.join(backupDir, 'inputData_backup.xml'), (err) => {
                    if (err) return console.error('Error creating backup:', err);
                    console.log('✅ Backup created successfully.');
                });

            } catch (validationErr) {
                console.error('❌ Validation error:', validationErr.message);
            }
        });
    });
}

// Run the process
processXML(inputFile);
