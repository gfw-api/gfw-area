const DataApiAdminLookup = require('adapters/dataApiAdminLookup.adapter');

class AdminLookupService {

    static async findMatch(administrativeVersion) {
        return DataApiAdminLookup.findMatch(administrativeVersion);
    }

}

module.exports = AdminLookupService;
