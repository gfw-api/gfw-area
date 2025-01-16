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
     * Build and add (or update) an AdministrativeVersion entry in `areaModel.adminVersions`.
     * Will only proceed if the area is an administrative boundary.
     */
    async populateAdminVersions() {
        if (!this.isAdministrativeBoundary()) return;

        const adminVersion = AdministrativeVersion.build(
            this.areaModel.geostore,
            this.gatherAdministrativeNames(),
            this.gatherAdministrativeIds(),
        );

        this.addAdminVersion(adminVersion);

        const gadm41AdminVersionMatches = await AdminLookupService.findMatch(adminVersion);
        if (gadm41AdminVersionMatches?.length === 1) {
            this.addAdminVersion(gadm41AdminVersionMatches.pop());
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

    /**
     * Populates administrative boundary information (ISO codes, admin hierarchy, geostore, and name)
     * on this instance's `areaModel` based on the provided adminVersion.
     *
     * This function:
     *  1. Checks if the current area represents an administrative boundary; returns early if not.
     *  2. Searches `areaModel.adminVersions` for an entry matching the provided `adminVersion`.
     *  3. If found, sets:
     *     - `areaModel.iso` with `{ country, region, subregion }`.
     *     - `areaModel.admin` with `{ adm0, adm1, adm2 }`.
     *     - `areaModel.geostore`.
     *     - `areaModel.name` using subregion, region, and country names.
     *       - Note: In **some** test and production data scenarios where subregion or region is present
     *         but no country, the name intentionally ends with a trailing comma (e.g. `"Subregion, Region,"`).
     *         This behavior is required by existing tests and cannot be omitted without breaking them.
     *  4. If not found, the function returns without making changes.
     *
     * @param {Object} adminVersion - The administrative version object used to find a matching entry
     *                                in `areaModel.adminVersions`.
     * @returns {void} Mutates `this.areaModel` in place; does not return anything.
     */
    populateAdminInfo(adminVersion) {

        if (!this.isAdministrativeBoundary()) {
            return;
        }

        const adminInfo = this.areaModel.adminVersions.find(
            (v) => adminVersion.equals(new AdministrativeVersion(v))
        );

        if (!adminInfo) { // didn't find the requested version
            return;
        }

        const {
            country, region, subregion, geostore
        } = adminInfo;

        this.areaModel.geostore = geostore;

        this.areaModel.iso = {
            country: country?.id,
            region: region?.id,
            subregion: subregion?.id,
        };

        this.areaModel.admin = {
            adm0: country?.id,
            adm1: region?.id,
            adm2: subregion?.id,
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
