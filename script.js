const fs = require ('fs'); //helps read,write,move,rename files
const xml2js = require('xml2js'); //turn xml file to js
const path = require('path'); //helps build paths on my pc
const {Client} = require('pg'); //PostegreSQL client for Node.js


//get fille name when running script
const filePath = process.argv[2];//e.g node script.js data.xml

//check if file is a valid xml file
if(!filePath || !filePath.endsWith('.xml')){
    console.error('Please provide valid xml file');

}

// Function to validate XML data
function validateData(data) {
    if (!data.customer || !data.customer.Firstname || !data.customer.Lastname || !data.customer.Accountnumber || !data.customer.Balance) {
        throw new Error('Required fields are missing!');
    }
    return true;
}

//PostgreSQL connection setup
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'datavalidator',
    password:'Noela2012',
    port: 5432,

});

client.connect()
    .then(() => {
        console.log('connected to PostgreSQL');
        readAndParseXML(filePath);
    })
    .catch(err => {
        console.log('PostgreSQL connection failed', err);
    });


    function readAndParseXML(filePath){
        fs.readFile(filePath, 'utf-8', (err, data) => {//reads xml file as text
            if (err) {
                console.error('Error reading file:', err.message);
                return; 
            }
            //turn xml text into usable object
            xml2js.parseString(data, { explicitArray: false }, async (err, result) => {
                if (err){
                    console.error('Error parsing XML:', err.message);//shows this if i cant read the xml text
                    return;
                }
    
                console.log('✅ XML parsed successfully');
    
                // Make sure result.customers.customer exists
                const customerList = result.Customer?.Customer;//grabs <customer>entries inside main <customer> block
                if (!customerList) { //if there are no customer entries stop program
                    console.error('❌ No <customer> entries found in XML.');
                    return;
                }
    
                // If there's only one <customer>, wrap it in an array
                const customers = Array.isArray(customerList) ? customerList : [customerList];
    
                for (const cust of customers) { //loops through each customer and prep to insert to database
                    const firstname = cust.Firstname;
                    const lastname = cust.Lastname;
                    const accountnumber = cust.Accountnumber;
                    const balance = cust.Balance;
                    //pulls the fields out of each customer entry
                    if (firstname && lastname && accountnumber && balance) {
                        try {
                            await client.query(
                                'INSERT INTO customers (firstname, lastname, accountnumber, balance) VALUES ($1, $2, $3, $4)',
                                [
                                    firstname,
                                    lastname,
                                    accountnumber,
                                    parseFloat(balance.replace(/[^0-9.-]+/g, '')) //removes any symbol from balance field
                                ]
                            );
                            console.log(`✅ Inserted: ${firstname} ${lastname}`);
                        } catch (dbErr) {
                            console.error('❌ Failed to insert into PostgreSQL:', dbErr.message);
                        }
                    } else {
                        console.warn('⚠️ Skipped entry due to missing fields:', cust); //if any fields are mising skip this customer
                    }
                }
    
                console.log('✅ All customers processed.');
                client.end();
            });
        });
    }
    



/*
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
} */

//Flatten deeply nested XML into a flat key:value object
function flattenXML(obj, parent= '', res = {}){
    for(let key in obj) {
        let propName = parent ? '${parent}_${key}' :key;
        if (typeof obj[key] === 'object' && obj[key] !== null){
            flattenXML(obj[key], propName, res);
        } else{
            res[key] = obj[key];
        }
    }
    return res;
}

