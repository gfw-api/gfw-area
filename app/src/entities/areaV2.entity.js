const { isEqual } = require('lodash');
const AdministrativeVersion = require('valueObjects/administrativeVersion');
const AdminLookupService = require('services/adminLookup.service');

class AreaEntity {

    /**
     * Safely convert a number to a trimmed string.
     * Returns `null` if the value is not a valid number.
     *
     * @param {number} num - The value to convert to string.
     * @returns {string|null} The trimmed string representation, or `null` if invalid.
     */
    static safeNumberToString(num) {
        return (typeof num === 'number' && !Number.isNaN(num))
            ? num.toString().trim()
            : null;
    }

    /**
     * Create a new AreaEntity instance.
     *
     * @param {Object} areaModel - Data containing ISO, admin, name, etc.
     */
    constructor(areaModel) {
        this.areaModel = areaModel;
    }

    /**
     * Determine if the current area represents an administrative boundary.
     * This is `true` if `areaModel` has either an ISO country code or an admin-level 0 code.
     *
     * @returns {boolean} `true` if it's an administrative boundary, otherwise `false`.
     */
    isAdministrativeBoundary() {
        const hasIso = Boolean(this.areaModel.iso?.country);
        const hasAdmin = Boolean(this.areaModel.admin?.adm0);
        return hasIso || hasAdmin;
    }

    /**
     * Extract and return an array of administrative names from the `areaModel.name` property.
     * The names are split by commas, reversed, and trimmed. This is so the order of the names matches the
     * order of IDs.
     * For example, "State, Country" becomes ["Country", "State"].
     *
     * @returns {string[]} Array of reversed, trimmed administrative names (empty if no name is provided).
     */
    gatherAdministrativeNames() {
        // Safely create an array of trimmed names, reversed.
        return this.areaModel.name
            ? this.areaModel.name.split(',').reverse().map((v) => v.trim())
            : [];
    }

    /**
     * Gather the country, region, and subregion IDs based on the `admin` or `iso` properties.
     * - If `admin.adm0` is present, use `adm0` (country), `adm1` (region), and `adm2` (subregion).
     *   - Region and subregion may be numeric, so we pass them through `safeNumberToString`.
     * - Otherwise, use `iso.country`, `iso.region`, and `iso.subregion`.
     *
     * @returns {[string|null, string|null, string|null]} A tuple of `[countryId, regionId, subregionId]`.
     */
    gatherAdministrativeIds() {
        let countryId;
        let regionId;
        let subregionId;

        if (this.areaModel.admin?.adm0) {
            const { admin: { adm0, adm1, adm2 } } = this.areaModel;
            countryId = adm0?.trim() ?? null;
            regionId = AreaEntity.safeNumberToString(adm1);
            subregionId = AreaEntity.safeNumberToString(adm2);
        } else {
            const { iso: { country, region, subregion } } = this.areaModel;
            countryId = country?.trim() ?? null;
            regionId = region?.trim() ?? null;
            subregionId = subregion?.trim() ?? null;
        }

        return [countryId, regionId, subregionId];
    }

    /**
     * Retrieves source information from the area model.
     *
     * This function checks for a valid source object in both the `admin` and `iso` properties of the area model.
     * Both `admin` and `iso` are considered aliases and may contain a source object, with the `admin` source being
     * prioritized. If both the provider and version are available in the admin source, that information is returned.
     * Otherwise, the function falls back to the iso source. If neither source provides valid data, it returns the
     * default value from AdministrativeVersion.Sources.GADM_3_6.
     *
     * @returns {{provider: string, version: string}} An object containing the provider and version of the source,
     *   or the default source if neither admin nor iso has valid information.
     */
    gatherSourceInfo() {
        const { provider: adminProvider, version: adminVersion } = this.areaModel.admin?.source?.toObject() ?? {};
        const { provider: isoProvider, version: isoVersion } = this.areaModel.iso?.source?.toObject() ?? {};

        if (adminProvider && adminVersion) {
            return { provider: adminProvider, version: adminVersion };
        }

        if (isoProvider && isoVersion) {
            return { provider: isoProvider, version: isoVersion };
        }

        return AdministrativeVersion.Sources.GADM_3_6;
    }

    /**
     * Build and add (or update) an AdministrativeVersion entry in `areaModel.adminVersions`.
     *
     * This method only proceeds if the area is an administrative boundary. It gathers source
     * information from the area model (prioritizing the `admin` source over the `iso` source),
     * then builds a new AdministrativeVersion entry using the area's geostore, administrative names,
     * administrative IDs, and the retrieved source information.
     *
     * **Important:** If the source information indicates GADM 4.1, the AdminLookupService is not used.
     * This is done to prevent potentially overwriting data that a client has explicitly saved.
     *
     * @async
     * @returns {Promise<void>}
     */
    async populateAdminVersions() {
        if (!this.isAdministrativeBoundary()) return;

        const sourceInfo = this.gatherSourceInfo();

        const adminVersion = AdministrativeVersion.build(
            this.areaModel.geostore,
            this.gatherAdministrativeNames(),
            this.gatherAdministrativeIds(),
            sourceInfo,
        );

        this.addAdminVersion(adminVersion);

        if (!isEqual(sourceInfo, AdministrativeVersion.Sources.GADM_4_1)) {
            const gadm41AdminVersionMatches = await AdminLookupService.findMatch(adminVersion);
            if (gadm41AdminVersionMatches?.length === 1) {
                this.addAdminVersion(gadm41AdminVersionMatches.pop());
            }
        }
    }

    /**
     * Insert or replace an `AdministrativeVersion` in the `adminVersions` array.
     * - If the version does not already exist, it is appended.
     * - If it does exist, the existing entry is replaced in place.
     *
     * @param {AdministrativeVersion} adminVersion - The new or updated AdministrativeVersion instance.
     */
    addAdminVersion(adminVersion) {
        const index = this.areaModel.adminVersions.findIndex(
            (v) => adminVersion.equals(new AdministrativeVersion(v))
        );

        const adminVersionData = JSON.parse(JSON.stringify(adminVersion));

        if (index === -1) { // No match found, insert at the end
            this.areaModel.adminVersions.push(adminVersionData);
        } else { // Found a match, replace the existing entry while keeping insertion order
            this.areaModel.adminVersions[index] = adminVersionData;
        }
    }

    hasAdminVersion(adminVersion) {
        return Boolean(this.areaModel.adminVersions.find(
            (v) => adminVersion.equals(new AdministrativeVersion(v))
        ));
    }

    /**
     * Populates administrative boundary information (ISO codes, admin hierarchy, geostore, and name)
     * on this instance's `areaModel` based on the provided adminVersion.
     *
     * This function:
     *  1. Checks if the current area represents an administrative boundary; returns early if not.
     *  2. If `areaModel.adminVersions` is missing or empty:
     *     - If `areaModel.iso` has a `country`, sets `areaModel.iso.source` to `{ provider: 'gadm', version: '3.6' }`.
     *     - If `areaModel.admin` has an `adm0`, sets `areaModel.admin.source` to `{ provider: 'gadm', version: '3.6' }`.
     *     - Returns early.
     *  3. Otherwise, searches `areaModel.adminVersions` for an entry matching the provided `adminVersion`.
     *  4. If found, sets:
     *     - `areaModel.iso` with `{ country, region, subregion }` and associated source information.
     *     - `areaModel.admin` with `{ adm0, adm1, adm2 }` and associated source information.
     *     - `areaModel.geostore`.
     *     - `areaModel.name` using subregion, region, and country names.
     *       - Note: In **some** test and production data scenarios where subregion or region is present
     *         but no country, the name intentionally ends with a trailing comma (e.g. `"Subregion, Region,"`).
     *         This behavior is required by existing tests and cannot be omitted without breaking them.
     *  5. If no matching entry is found, the function returns without making further changes.
     *
     * @param {Object} adminVersion - The administrative version object used to find a matching entry
     *                                in `areaModel.adminVersions`.
     * @returns {void} Mutates `this.areaModel` in place; does not return anything.
     */
    populateAdminInfo(adminVersion) {

        if (!this.isAdministrativeBoundary()) {
            return;
        }

        if (!this.areaModel.adminVersions || this.areaModel.adminVersions.length === 0) { // no adminVersions history!
            if (this.areaModel.iso?.country) {
                this.areaModel.iso.source = {
                    provider: 'gadm',
                    version: '3.6',
                };
            }

            if (this.areaModel.admin?.adm0) {
                this.areaModel.admin.source = {
                    provider: 'gadm',
                    version: '3.6',
                };
            }

            return;
        }

        const adminInfo = this.areaModel.adminVersions.find(
            (v) => adminVersion.equals(new AdministrativeVersion(v))
        );

        const {
            provider, version, country, region, subregion, geostore
        } = adminInfo;

        this.areaModel.geostore = geostore;

        this.areaModel.iso = {
            country: country?.id,
            region: region?.id,
            subregion: subregion?.id,
            source: {
                provider,
                version,
            },
        };

        this.areaModel.admin = {
            adm0: country?.id,
            adm1: region?.id,
            adm2: subregion?.id,
            source: {
                provider,
                version,
            },
        };

        const nameParts = [];

        if (subregion?.id) {
            nameParts.push(subregion.name?.trim());
        }

        if (region?.id) {
            nameParts.push(region.name?.trim());
        }

        if (country?.id) {
            nameParts.push(country.name?.trim());
        }

        const filtered = nameParts.filter(Boolean);

        if (filtered.length === 0) { // no names
            this.areaModel.name = '';
        } else if (filtered.length === 1 && country?.name) { // country only
            this.areaModel.name = country.name.trim();
        } else {
            this.areaModel.name = nameParts.join(', ');
        }
    }

}

module.exports = AreaEntity;
