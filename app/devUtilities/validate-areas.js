/* eslint-disable import/no-extraneous-dependencies, no-console, no-restricted-syntax */
const { Command } = require('commander');
const mongoose = require('mongoose');
const fs = require('fs');
const cliProgress = require('cli-progress');
const Area = require('models/area.modelV2');

// Setup Commander for CLI options
const program = new Command();

program
    .name('validate-areas')
    .description('CLI tool to validate and optionally save all documents in the Area collection.')
    .option('-h, --host <host>', 'MongoDB host', 'localhost')
    .option('-p, --port <port>', 'MongoDB port', '27017')
    .option('-d, --database <database>', 'MongoDB database name', 'mydatabase')
    .option('-u, --username <username>', 'MongoDB username', 'admin')
    .option('-P, --password <password>', 'MongoDB password', 'password123')
    .option('-b, --batch-size <number>', 'Number of documents to process in each batch', 500)
    .option('--dryrun', 'Skip saving changes and only run validation')
    .option('--logfile <path>', 'Save logs to a specified file')
    .parse(process.argv);

// Get options from the CLI
const options = program.opts();

// Build the MongoDB URI
const mongoURI = `mongodb://${options.username}:${options.password}@${options.host}:${options.port}/${options.database}?directConnection=true&retryWrites=false`;

// Batch size
const BATCH_SIZE = parseInt(options.batchSize, 10);

// Create a write stream for logging if --logfile is provided
let logStream = null;
if (options.logfile) {
    logStream = fs.createWriteStream(options.logfile, { flags: 'a' });
    console.log(`📄 Logs will be saved to: ${options.logfile}`);
}

// Function to log messages to both console and file
function logMessage(message) {
    if (!options.logfile) {
        console.log(message);
    }
    if (logStream) {
        logStream.write(`${message}\n`);
    }
}

// Function to always log metrics to both console and file
function logStats(message) {
    console.log(message);
    if (logStream) {
        logStream.write(`${message}\n`);
    }
}

// Statistics
let totalDocuments = 0;
let totalValidated = 0;
let totalFailures = 0;
let totalAdminBoundaries = 0;

// Function to check if a document is an Administrative Boundary
function isAdministrativeBoundary(area) {
    return area.admin?.adm0 || area.iso?.country;
}

// Function to connect to MongoDB
async function connectDB() {
    const configs = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 60000,
        keepAlive: true,
        keepAliveInitialDelay: 300000,
    };

    try {
        await mongoose.connect(mongoURI, configs);

        mongoose.connection.on('disconnected', () => {
            logStats('🔌  MongoDB connection lost. Attempting to reconnect...');
            mongoose.connect(mongoURI, configs);
        });

        mongoose.connection.on('reconnected', () => {
            logStats('🔄 MongoDB reconnected.');
        });

        logStats('✅  Connected to MongoDB');
    } catch (err) {
        logStats(`❌  Error connecting to MongoDB: ${err}`);
        process.exit(1);
    }
}

// Function to validate Area documents in batches
async function validateAreasInBatches() {
    let lastId = null;
    let hasMore = true;

    // Count the total number of documents in the collection for progress tracking
    const totalDocumentsCount = await Area.countDocuments();
    if (totalDocumentsCount === 0) {
        logMessage('No documents found in the Area collection.');
        return;
    }

    // Create a new progress bar instance with ETA and seconds/doc
    const progressBar = new cliProgress.SingleBar(
        {
            format: 'Progress | {bar} | {percentage}% | {value}/{total} Docs | {speed}s/doc | ETA: {eta}s',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
        },
        cliProgress.Presets.shades_classic
    );

    // Start the progress bar
    progressBar.start(totalDocumentsCount, 0, {
        speed: 'N/A',
        eta: 'N/A',
    });

    // Start time for calculating seconds/doc and ETA
    const startTime = Date.now();

    while (hasMore) {
        try {
            const query = lastId ? { _id: { $gt: lastId } } : {};
            const areas = await Area.find(query).limit(BATCH_SIZE).sort({ _id: 1 });

            if (areas.length === 0) {
                hasMore = false;
                break;
            }

            for (const area of areas) {
                totalDocuments++;

                // Check if the document is an Administrative Boundary
                if (isAdministrativeBoundary(area)) {
                    totalAdminBoundaries++;
                }

                if (options.dryrun) {
                    try {
                        await area.validate();
                        logMessage(`💡 [Dry Run] Validated Area: ${area.name || 'Unnamed'} (ID: ${area._id})`);
                        totalValidated++;
                    } catch (validationError) {
                        logMessage(`❌  Validation Error for Area ID: ${area._id} - ${validationError}`);
                        totalFailures++;
                    }
                } else {
                    try {
                        await area.save();
                        logMessage(`✅  Saved Area: ${area.name || 'Unnamed'} (ID: ${area._id})`);
                        totalValidated++;
                    } catch (saveError) {
                        logMessage(`❌  Error saving Area ID: ${area._id} - ${saveError}`);
                        totalFailures++;
                    }
                }

                // Calculate the elapsed time and update seconds/doc
                const elapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
                const secondsPerDoc = (elapsedTime / totalDocuments).toFixed(2);

                // Calculate ETA
                const remainingDocs = totalDocumentsCount - totalDocuments;
                const eta = (remainingDocs * secondsPerDoc).toFixed(0);

                // Update the progress bar
                progressBar.update(totalDocuments, {
                    speed: secondsPerDoc,
                    eta,
                });
            }

            lastId = areas[areas.length - 1]._id;
        } catch (err) {
            logMessage(`❌  Error during batch processing: ${err}`);
        }
    }

    // Stop the progress bar when done
    progressBar.stop();
}

// Function to log the final statistics
function logFinalStats() {
    logStats('\n🔎  Validation Metrics:');
    logStats(`📊  Total Documents Processed: ${totalDocuments}`);
    logStats(`🌍  Total Administrative Boundaries: ${totalAdminBoundaries}`);
    logStats(`✅  Total Validated Successfully: ${totalValidated}`);
    logStats(`❌  Total Validation Failures: ${totalFailures}`);
    logStats(`📈  Success Rate: ${((totalValidated / totalDocuments) * 100).toFixed(2)}%`);
    logStats(`📉  Failure Rate: ${((totalFailures / totalDocuments) * 100).toFixed(2)}%`);

    if (options.dryrun) {
        logStats('💡 [Dry Run] No changes were saved to the database.');
    }
}

// Main function to connect and run the validation
async function main() {
    await connectDB();
    await validateAreasInBatches();

    mongoose.connection.removeAllListeners('disconnected');
    await mongoose.connection.close();
    logStats('🔌  Disconnected from MongoDB');

    console.clear();
    logFinalStats();

    if (logStream) {
        logStream.end();
    }

    process.exit(0);
}

// Run the script
main();
