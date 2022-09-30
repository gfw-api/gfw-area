const logger = require('logger');
const Area = require('models/area.model');
const TeamService = require('services/team.service');

class AreaService {

    static async getAll(query = {}, user) {

        logger.info(`[DBACCESS-FIND]: all areas`);
        const sort = query.sort || '';
        const page = query['page[number]'] ? parseInt(query['page[number]'], 10) : 1;
        logger.debug(`pageNumber param: ${page}`);
        const limit = query['page[size]'] ? parseInt(query['page[size]'], 10) : 1000;
        logger.debug(`pageSize param: ${limit}`);
        const ids = query.ids ? query.ids.split(',').map((el) => el.trim()) : [];
        logger.debug(`ids param: ${ids}`);
        const filteredQuery = AreaService.getFilteredQuery({ ...query, userId: user.id }, ids);
        logger.debug(`filteredQuery: ${JSON.stringify(filteredQuery)}`);
        const filteredSort = AreaService.getFilteredSort(sort);
        const options = {
            page,
            limit,
            sort: filteredSort
        };
        logger.debug(`[AreaService] Query options: ${JSON.stringify(options)}`);
        logger.info(`[DBACCESS-FIND]: area`);
        let pages = await Area.paginate(filteredQuery, options);
        pages = { ...pages };
        return pages;
    }

    static getFilteredQuery(query, ids = []) {
        const areaAttributes = Object.keys(Area.schema.obj);
        logger.debug(`[getFilteredQuery] areaAttributes: ${areaAttributes}`);
        Object.keys(query).forEach((param) => {
            if (areaAttributes.indexOf(param) < 0) {
                delete query[param];
            } else {

                switch (Area.schema.paths[param].instance) {

                    case 'String':
                        query[param] = {
                            $regex: query[param],
                            $options: 'i'
                        };
                        break;
                    case 'Array':
                        if (query[param].indexOf('@') >= 0) {
                            query[param] = {
                                $all: query[param].split('@').map((elem) => elem.trim())
                            };
                        } else {
                            query[param] = {
                                $in: query[param].split(',').map((elem) => elem.trim())
                            };
                        }
                        break;
                    default:
                        break;

                }
            }
        });
        if (ids.length > 0) {
            query._id = {
                $in: ids
            };
        }
        return query;
    }

    static getFilteredSort(sort) {
        const sortParams = sort.split(',');
        const filteredSort = {};
        const areaAttributes = Object.keys(Area.schema.obj);
        sortParams.forEach((param) => {
            let sign = param.substr(0, 1);
            let signlessParam = param.substr(1);
            if (sign !== '-' && sign !== '+') {
                signlessParam = param;
                sign = '+';
            }
            if (areaAttributes.indexOf(signlessParam) >= 0) {
                filteredSort[signlessParam] = parseInt(sign + 1, 10);
            }
        });
        return filteredSort;
    }

    static async getByDataset(resource) {
        logger.debug(`[AreaService] Getting areas for datasets with ids ${resource.ids}`);
        if (resource.app) {
            if (resource.app.indexOf('@') >= 0) {
                resource.app = {
                    $all: resource.app.split('@').map((elem) => elem.trim())
                };
            } else {
                resource.app = {
                    $in: resource.app.split(',').map((elem) => elem.trim())
                };
            }
        }
        const query = {
            dataset: {
                $in: resource.ids
            }
        };
        if (resource.app) {
            query.application = resource.app;
        }
        logger.debug(`[AreaService] IDs query: ${JSON.stringify(query)}`);
        return Area.find(query).exec();
    }

    static async hasPermission(id, user) {
        let permission = true;
        const area = await AreaService.get(id, null, []);
        const appPermission = area.application.find((areaApp) => user.extraUserData.apps.find((app) => app === areaApp));
        if (!appPermission) {
            permission = false;
        }
        if ((user.role === 'MANAGER' || user.role === 'USER') && (!area.userId || area.userId !== user.id)) {
            permission = false;
        }
        return permission;
    }

    static async deleteByUserId(userId) {
        logger.debug(`[AreaV1Service]: Delete areas for user with id:  ${userId}`);

        const userAreas = await Area.find({ userId: { $eq: userId } }).exec();

        if (userAreas) {
            for (let i = 0, { length } = userAreas; i < length; i++) {
                const currentArea = userAreas[i];
                const currentAreaId = currentArea._id.toString();
                logger.debug('[AreasService]: Deleting areas from teams');
                let team = null;
                try {
                    team = await TeamService.getTeamByUserId(userId);
                } catch (e) {
                    logger.error(e);
                }

                if (team && team.areas.includes(currentAreaId)) {
                    const areas = team.areas.filter((area) => area !== currentAreaId);
                    try {
                        await TeamService.patchTeamById(team.id, { areas });
                    } catch (e) {
                        logger.error(e);
                    }
                }
                await currentArea.remove();
            }
        }
        return userAreas;
    }

}

module.exports = AreaService;
