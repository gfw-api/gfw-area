const Koa = require('koa');
const logger = require('logger');
const koaLogger = require('koa-logger');
const koaBody = require('koa-body');
const config = require('config');
const loader = require('loader');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
const ErrorSerializer = require('serializers/error.serializer');
const mongoose = require('mongoose');
const koaValidate = require('koa-validate');
const koaSimpleHealthCheck = require('koa-simple-healthcheck');
const sleep = require('sleep');

const mongoUri = process.env.MONGO_URI || `mongodb://${config.get('mongodb.host')}:${config.get('mongodb.port')}/${config.get('mongodb.database')}`;

const koaBodyMiddleware = koaBody({
    multipart: true,
    jsonLimit: '50mb',
    formLimit: '50mb',
    textLimit: '50mb',
    formidable: {
        multipart: true,
        uploadDir: '/tmp'
    }
});

const mongooseOptions = require('../../config/mongoose');

let retries = 10;

const onDbReady = (err) => {
    if (err) {
        if (retries >= 0) {
            retries--;
            logger.error(`Failed to connect to MongoDB uri ${mongoUri} with error message "${err.message}", retrying...`);
            sleep.sleep(5);
            mongoose.connect(mongoUri, onDbReady);
        } else {
            logger.error('MongoURI', mongoUri);
            logger.error(err);
            throw new Error(err);
        }
    }

    logger.info(`Connected to mongoDB`);
};

mongoose.connect(mongoUri, mongooseOptions, onDbReady);

const app = new Koa();

app.use(koaBodyMiddleware);

app.use(koaSimpleHealthCheck());

app.use(async (ctx, next) => {
    try {
        await next();
    } catch (applicationError) {
        let error = applicationError;
        try {
            error = JSON.parse(applicationError);
        } catch (e) {
            logger.debug('Could not parse error message - is it JSON?: ', applicationError);
            error = applicationError;
        }
        ctx.status = error.status || ctx.status || 500;
        if (ctx.status >= 500) {
            logger.error(error);
        } else {
            logger.info(error);
        }

        ctx.body = ErrorSerializer.serializeError(ctx.status, error.message);
        if (process.env.NODE_ENV === 'prod' && ctx.status === 500) {
            ctx.body = 'Unexpected error';
        }
        ctx.response.type = 'application/vnd.api+json';
    }

});

app.use(koaLogger());

app.use(RWAPIMicroservice.bootstrap({
    logger,
    gatewayURL: process.env.GATEWAY_URL,
    microserviceToken: process.env.MICROSERVICE_TOKEN,
    fastlyEnabled: process.env.FASTLY_ENABLED,
    fastlyServiceId: process.env.FASTLY_SERVICEID,
    fastlyAPIKey: process.env.FASTLY_APIKEY
}));

koaValidate(app);

loader.loadRoutes(app);

const port = process.env.PORT || '3000';
const server = app.listen(port, () => {
    logger.info('Server started in ', port);
});

logger.info('Server started in ', process.env.PORT);

module.exports = server;
