/**
 * A Value Object representing a version of an administrative boundary
 * based on GADM data. An AdministrativeVersion typically includes information
 * about the provider, version, geostore, and relevant administrative levels
 * (country, region, subregion).
 */
class AdministrativeVersion {

    static Sources = {
        GADM_3_6: { provider: 'gadm', version: '3.6' },
        GADM_4_1: { provider: 'gadm', version: '4.1' },
    };

    static Versions = {
        GADM_3_6: new AdministrativeVersion(this.Sources.GADM_3_6),
        GADM_4_1: new AdministrativeVersion(this.Sources.GADM_4_1),
    };

    /**
     * Constructs a new AdministrativeVersion object from given geostore and
     * administrative level data.
     *
     * @param {string} geostore - The geostore identifier or data.
     * @param {string[]} names - Array of names `[countryName, regionName, subregionName]`.
     * @param {string[]} ids - Array of IDs `[countryId, regionId, subregionId]`.
     * @returns {AdministrativeVersion} A new AdministrativeVersion instance.
     */
    static build(
        geostore,
        [countryName, regionName, subregionName],
        [countryId, regionId, subregionId],
        { provider, version } = this.Sources.GADM_3_6
    ) {
        return new AdministrativeVersion({
            geostore,
            country: {
                id: countryId,
                name: countryName,
            },
            region: regionId && {
                id: regionId,
                name: regionName,
            },
            subregion: subregionId && {
                id: subregionId,
                name: subregionName,
            },
            provider,
            version,
        });
    }

    /**
     * Creates an instance of AdministrativeVersion.
     *
     * @param {object} [options={}] - The configuration object for creating an instance.
     * @param {string} [options.provider='gadm'] - Administrative data provider.
     * @param {string} [options.version='3.6'] - Version of the administrative data.
     * @param {string} [options.geostore=''] - The geostore identifier or raw geostore data.
     * @param {object} [options.country={ id: '', name: '' }] - Country information.
     * @param {string} options.country.id - Country ID.
     * @param {string} options.country.name - Country name.
     * @param {object|null} [options.region=null] - Region information (if applicable).
     * @param {string} [options.region.id] - Region ID.
     * @param {string} [options.region.name] - Region name.
     * @param {object|null} [options.subregion=null] - Subregion information (if applicable).
     * @param {string} [options.subregion.id] - Subregion ID.
     * @param {string} [options.subregion.name] - Subregion name.
     */
    constructor({
        provider = 'gadm',
        version = '3.6',
        geostore = '',
        country = { id: '', name: '' },
        region = null,
        subregion = null
    } = {}) {
        this.provider = provider;
        this.version = version;
        this.geostore = geostore;
        this.country = country;
        if (region && region.id) {
            this.region = region;
        }

        if (subregion && subregion.id) {
            this.subregion = subregion;
        }
    }

    /**
     * Compares this instance to another AdministrativeVersion instance for value-based equality.
     *
     * @param {object} other - The instance to compare against.
     * @returns {boolean} True if both instances have the same provider and version, false otherwise.
     */
    equals(other) {
        if (!other || !(other instanceof AdministrativeVersion)) return false;
        return (
            this.provider === other.provider
            && this.version === other.version
        );
    }

}

module.exports = AdministrativeVersion;
