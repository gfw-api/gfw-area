/* eslint-disable import/no-extraneous-dependencies, no-console */
const { Command } = require('commander');
const mongoose = require('mongoose');
const fs = require('fs');
const cliProgress = require('cli-progress');
const Area = require('models/area.modelV2');

// Setup Commander for CLI options
const program = new Command();

program
    .name('update-subsriptions')
    .description('CLI tool to add Area  for Subscription collections.')
    .option('-h, --host <host>', 'MongoDB host', 'localhost')
    .option('-a, --area-port <port>', 'MongoDB area port', '27018')
    .option('-s, --subscription-port <port>', 'MongoDB subscription port', '27017')
    .option('-A, --area-database <database>', 'MongoDB area database name', 'gfw_areas')
    .option('-S, --subscription-database <database>', 'MongoDB subscription database name', 'gfw_subscription_db')
    .option('-u, --username <username>', 'MongoDB username', '')
    .option('-P, --password <password>', 'MongoDB password', '')
    .option('--dryrun', 'Skip saving changes and only run validation')
    .option('--logfile <path>', 'Save logs to a specified file')
    .parse(process.argv);

// Get options from the CLI
const options = program.opts();

// Build the MongoDB URI
const mongoURI = `mongodb://${options.username}:${options.password}@${options.host}`;

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
let processedGadmAreas = 0;
let areasWithSubscriptionsCount = 0;
let updatedSubscriptions = 0;

// Function to connect to MongoDB
/* eslint-disable consistent-return */
async function connectDB(database, port) {
    const configs = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 60000,
        keepAlive: true,
        keepAliveInitialDelay: 300000,
    };

    try {
        const connection = await mongoose.createConnection(
            `${mongoURI}:${port}/${database}?directConnection=true&retryWrites=false`,
            configs
        );

        connection.on('disconnected', () => {
            logStats('🔌  MongoDB connection lost. Attempting to reconnect...');
            mongoose.connect(mongoURI, configs);
        });

        connection.on('reconnected', () => {
            logStats('🔄 MongoDB reconnected.');
        });

        logStats('✅  Connected to MongoDB');

        return connection;
    } catch (err) {
        logStats(`❌  Error connecting to MongoDB: ${err}`);
        process.exit(1);
    }

}

// Function to add Area id to Subscription records
async function updateSubscriptions() {

    const areaConnection = await connectDB(options.areaDatabase, options.areaPort);
    const AreaForConnection = areaConnection.model('area', Area.Schema);
    const totalDocumentsCount = await AreaForConnection.countDocuments();
    // Count the total number of documents in the collection for progress tracking
    const areas = await AreaForConnection.find({
        subscriptionId: { $nin: ['', null] },
    });
    areasWithSubscriptionsCount = areas.length;
    if (areasWithSubscriptionsCount.length === 0) {
        logMessage('No GADM areas found in the Area collection.');
        return;
    }

    const DynamicSchema = new mongoose.Schema({
        params: { type: Object, default: {} },
    }, {
        strict: false
    });

    const subscriptionConnection = await connectDB(options.subscriptionDatabase, options.subscriptionPort);
    const Subscription = subscriptionConnection.model('subscription', DynamicSchema);

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
    progressBar.start(areasWithSubscriptionsCount, 0, {
        speed: 'N/A',
        eta: 'N/A',
    });

    // Start time for calculating seconds/doc and ETA
    const startTime = Date.now();

    /* eslint-disable no-restricted-syntax */
    for (const area of areas) {
        try {
            processedGadmAreas++;

            // Calculate the elapsed time and update seconds/doc
            const elapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
            const secondsPerDoc = (elapsedTime / processedGadmAreas).toFixed(2);

            // Calculate ETA
            const remainingDocs = totalDocumentsCount - processedGadmAreas;
            const eta = (remainingDocs * secondsPerDoc).toFixed(0);

            // Update the progress bar
            progressBar.update(processedGadmAreas, {
                speed: secondsPerDoc,
                eta,
            });

            if (options.dryrun) {
                const subscription = await Subscription.findById(area.subscriptionId);
                if (subscription) {
                    updatedSubscriptions++;
                } else {
                    logMessage(`❌ Can't find subscription ${area.subscriptionId}`);

                }
            } else {
                const subscription = await Subscription.findById(area.subscriptionId);

                subscription.params = { ...subscription.params, area: area.id };

                await subscription.save();
                updatedSubscriptions++;
            }

        } catch (err) {
            logMessage(`❌  Error during batch processing: ${err}`);
        }
    }
    areaConnection.close();
    subscriptionConnection.close();

    // Stop the progress bar when done
    progressBar.stop();
}

// Function to log the final statistics
function logFinalStats() {
    logStats('\n🔎  Validation Metrics:');
    logStats(`🌍  Total GADM Areas with Subscriptions: ${areasWithSubscriptionsCount}`);
    logStats(`✅  Total subscriptions updated Successfully: ${updatedSubscriptions}`);
    logStats(`❌  Total failed subscription updates: ${areasWithSubscriptionsCount - updatedSubscriptions}`);
    logStats(`📈  Success Rate: ${((updatedSubscriptions / areasWithSubscriptionsCount) * 100).toFixed(2)}%`);

    if (options.dryrun) {
        logStats('💡 [Dry Run] No changes were saved to the database.');
    }
}

// Main function to connect and run the validation
async function main() {
    await updateSubscriptions();

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
