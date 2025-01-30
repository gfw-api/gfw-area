const logger = require('logger');
const axios = require('axios');
const AdministrativeVersion = require('valueObjects/administrativeVersion');

class DataApiAdminLookup {

    static async findMatch(administrativeVersion) {
        try {
            const params = this.buildQueryParams(administrativeVersion);
            const response = await this.performLookup(params);
            const matches = this.buildMatchedAdministrativeVersions(response);
            logger.info(`[AREAS-V2-DataApiAdminLookup-Adapter] GADM 3.6: ${JSON.stringify(administrativeVersion)} -> GADM 4.1 Lookup: ${JSON.stringify(matches)}`);
            return matches;
        } catch (e) {
            logger.error(`[AREAS-V2-DataApiAdminLookup-Adapter] Failed to encode AdministrativeVersion: ${administrativeVersion} \n response from DataApi Service was: ${e}`, e);
            return [];
        }
    }

    static buildQueryParams(administrativeVersion) {
        const { country, region, subregion } = administrativeVersion;

        return {
            admin_version: '4.1',
            ...(country?.name && { country: country.name }),
            ...(region?.name && { region: region.name }),
            ...(subregion?.name && { subregion: subregion.name }),
        };
    }

    static async performLookup(params) {
        return axios.get(
            '/political/id-lookup',
            {
                baseURL: 'https://data-api.globalforestwatch.org',
                timeout: 3000,
                headers: { 'Content-Type': 'application/json' },
                params,
            }
        );
    }

    static buildMatchedAdministrativeVersions(response) {
        return response?.data?.data?.matches.map((adminInfo) => new AdministrativeVersion(
            {
                provider: response.data.data.adminSource.toLocaleLowerCase().trim(),
                version: response.data.data.adminVersion,
                ...adminInfo,
            }
        ));
    }

}

module.exports = DataApiAdminLookup;
