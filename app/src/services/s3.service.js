const logger = require('logger');
const AWS = require('aws-sdk');
const config = require('config');
const uuidV4 = require('uuid/v4');
const { PassThrough } = require('node:stream');

AWS.config.update({
    accessKeyId: config.get('s3.accessKeyId'),
    secretAccessKey: config.get('s3.secretAccessKey')
});

class S3Service {

    static getExtension(name) {
        const parts = name.split('.');
        return parts[parts.length - 1];
    }

    static uploadStream(file) {
        logger.info(`Streaming file ${file.path} with size ${file.size} to S3`);

        const pass = new PassThrough();
        const uuid = uuidV4();
        const ext = S3Service.getExtension(file.originalFilename);

        try {
            const s3Client = new AWS.S3();
            s3Client.upload({
                Bucket: config.get('s3.bucket'),
                Key: `${config.get('s3.folder')}/${uuid}.${ext}`,
                Body: pass,
            }, (error, s3UploadData) => {
                if (error) {
                    logger.error('[S3Service] Error uploading file to S3', error);
                    return;
                }
                logger.debug('File uploaded successfully', s3UploadData);
                file.s3Url = `https://s3.amazonaws.com/${config.get('s3.bucket')}/${config.get('s3.folder')}/${uuid}.${ext}`;
            });
        } catch (error) {
            logger.error(`Error streaming to S3: ${error.toString()}`);
        }

        return pass;
    }

}

module.exports = S3Service;
