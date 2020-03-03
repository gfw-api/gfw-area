const logger = require('logger');
const SparkPost = require('sparkpost');
const config = require('config');

const API_KEY = config.get('sparkpost.key');

class MailService {

    constructor(publicUrl, disableEmailSending = false) {
        logger.debug('[MailService] Initializing mail service');
        if (API_KEY) {
            this.client = new SparkPost(API_KEY);
        } else {
            logger.info('Skipping init of Sparkpost client due to missing API key.');
        }
        this.publicUrl = publicUrl;
        this.disableEmailSending = disableEmailSending;
    }

    async sendMail(template, data, recipients, sender = 'gfw') {
        logger.info(`[MailService] Sending areas "${template}" email to `, recipients);
        const reqOpts = {
            substitution_data: { ...data, application: sender },
            content: { template_id: template },
            recipients,
        };

        logger.info(`[MailService] Email service request options:`, reqOpts);
        if (this.disableEmailSending) {
            logger.info(`[MailService] Email sending disabled, skipping ${template} email`);
            logger.info(reqOpts);
            return new Promise((resolve) => resolve());
        }

        return new Promise((resolve, reject) => {
            logger.info(reqOpts);
            this.client.transmissions.send(reqOpts, (error, res) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(res);
                }
            });
        });
    }

}

module.exports = new MailService();
