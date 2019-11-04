const logger = require('logger');
const AWS = require('aws-sdk');
const config = require('config');
const moment = require('moment');

AWS.config.update({
    accessKeyId: config.get('s3.accessKeyId'),
    secretAccessKey: config.get('s3.secretAccessKey')
});

class S3Service {

    constructor() {
        this.s3 = new AWS.S3();
    }

    static getExtension(name) {
        const parts = name.split('.');
        return parts[parts.length - 1];
    }

    async uploadJson(data) {
        logger.info(`Uploading file json`);
        return new Promise((resolve, reject) => {
            const date = moment().format('YYYYMMDD');
            this.s3.upload({
                Bucket: config.get('aoiDataS3.bucket'),
                Key: `${config.get('aoiDataS3.folder')}/${date}.json`,
                Body: data,
                ACL: 'public-read'
            }, (resp) => {
                if (resp && resp.statusCode >= 300) {
                    logger.error(resp);
                    reject(resp);
                    return;
                }
                logger.debug('File uploaded successfully', resp);
                resolve(`https://aoiDataS3.amazonaws.com/${config.get('aoiDataS3.bucket')}/${config.get('aoiDataS3.folder')}/${date}.json`);
            });
        });
    }

}

module.exports = new S3Service();
