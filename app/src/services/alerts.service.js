const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
const config = require('config');
const geohash = require('ngeohash');
const Mustache = require('mustache');
const request = require('request-promise');
const templateImage = require('./template-image.json');

// eslint-disable-next-line max-len
const POINTS = `WITH data AS (SELECT '{{{geojson}}}'::json AS fc) SELECT  ST_TRANSFORM(ST_SETSRID(ST_AsText(ST_GeomFromGeoJSON(feat->>'geometry')), 4326),3857) AS the_geom_webmercator, (feat->'properties'->>'count')::INTEGER as count, (feat->'properties'->>'type')::text as type FROM (  SELECT json_array_elements(fc->'features') AS feat  FROM data) AS f`;

class AlertService {

    static convert2Geojson(group) {
        logger.debug('Convert to geojson group ->');
        const data = {
            type: 'FeatureCollection',
            features: []
        };
        for (let i = 0; i < group.length; i++) {
            const latlon = geohash.decode(group[i].geohash);
            data.features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [latlon.longitude, latlon.latitude]
                },
                properties: {
                    count: group[i].count,
                    type: group[i].type
                }
            });
        }
        return JSON.stringify(data).replace(/"/g, '\\"');
    }

    static groupPoints(dataViirs, dataGlad, precisionBbox) {
        logger.debug('Group points', ' and precisionBbox ', precisionBbox);
        const result = {};
        if (dataViirs) {
            for (let i = 0, { length } = dataViirs; i < length; i++) {
                const substring = dataViirs[i].geohash.substring(0, precisionBbox);
                if (!result[substring]) {
                    result[substring] = {
                        points: []
                    };
                }
                dataViirs[i].type = 'viirs';
                result[substring].points.push(dataViirs[i]);
            }
        }
        if (dataGlad) {
            for (let i = 0, { length } = dataGlad; i < length; i++) {
                const substring = dataGlad[i].geohash.substring(0, precisionBbox);
                if (!result[substring]) {
                    result[substring] = {
                        points: []
                    };
                }
                dataGlad[i].type = 'glad';
                result[substring].points.push(dataGlad[i]);
            }
        }
        const keys = Object.keys(result);
        for (let i = 0, { length } = keys; i < length; i++) {
            result[keys[i]].geojson = AlertService.convert2Geojson(result[keys[i]].points);
            const bbox = geohash.decode_bbox(keys[i]);
            // long, lat (lower) long, lat upper
            result[keys[i]].bbox = [bbox[1], bbox[0], bbox[3], bbox[2]];
            result[keys[i]].query = Mustache.render(POINTS, {
                geojson: result[keys[i]].geojson
            });
            result[keys[i]].template = Mustache.render(JSON.stringify(templateImage), {
                query: result[keys[i]].query
            }).replace(/\s\s+/g, ' ').trim();
        }
        return result;
    }

    static async obtainImages(groups, generateImages) {
        logger.debug('Obtaining images with gropus');
        const response = [];
        if (groups) {
            const keys = Object.keys(groups);
            const promises = [];
            if (generateImages) {
                for (let i = 0, { length } = keys; i < length; i++) {
                    promises.push(request({
                        url: 'https://wri-01.cartodb.com/api/v1/map',
                        method: 'POST',
                        body: groups[keys[i]].template,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }));
                }
            }
            try {
                let results = [];
                if (generateImages) {
                    results = await Promise.all(promises);
                }
                for (let j = 0, lengthPromises = keys.length; j < lengthPromises; j++) {

                    let url = null;
                    if (generateImages) {
                        const result = results[j];
                        const layergroupid = result ? JSON.parse(result).layergroupid : '';
                        url = `http://wri-01.cartodb.com/api/v1/map/static/bbox/${layergroupid}/${groups[keys[j]].bbox.join(', ')}/700/700.png`;
                    }
                    let countViirs = 0;
                    let countGlad = 0;
                    // eslint-disable-next-line array-callback-return
                    groups[keys[j]].points.map((p) => {
                        if (p.type === 'glad') {
                            countGlad += p.count;
                        } else {
                            countViirs += p.count;
                        }
                    });
                    response.push({
                        geohash: keys[j],
                        countGlad,
                        countViirs,
                        url,
                        bbox: groups[keys[j]].bbox,
                        // query: groups[keys[i]].query
                    });
                }
            } catch (err) {
                // eslint-disable-next-line no-undef
                logger.error('Error obtaining image to key ', keys[i], err);
            }

        }
        return response;
    }

    static async getGeostoreByWdpa(wdpaid) {
        logger.debug('Obtaining geostore of wdpaid ', wdpaid);
        try {
            const result = await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/geostore/wdpa/${wdpaid}`,
                method: 'GET',
            });
            return result.data.id;
        } catch (err) {
            if (err.statusCode === 404) {
                throw new Error('Wdpa not found');
            }
        }

        return null;

    }

    static async getViirs(area, precisionPoint) {
        logger.debug('Obtaining data of viirs');
        const viirsDataset = config.get('viirsDataset');
        const table = config.get('viirsDatasetTableName');
        // eslint-disable-next-line max-len
        const uri = `v1//query/${viirsDataset}?sql=select count(*) as count, ST_GeoHash(the_geom, ${precisionPoint}) as geohash from ${table} where acq_date > '2017-01-01' group by ST_GeoHash(the_geom, ${precisionPoint})&geostore=${area.geostore}`;
        try {
            const result = await RWAPIMicroservice.requestToMicroservice({
                uri,
                method: 'GET',
            });
            return result;
        } catch (err) {
            logger.error(err);
            return null;
        }
    }

    static async getGlad(area, precisionPoint) {
        logger.debug('Obtaining data of glad');
        const gladDataset = config.get('gladDataset');
        const uri = `/v1/query/${gladDataset}?sql=select count(*) as count from data where year > 2016 group by ST_GeoHash(the_geom_point, ${precisionPoint})&geostore=${area.geostore}`;
        try {
            const result = await RWAPIMicroservice.requestToMicroservice({
                uri,
                method: 'GET',
            });
            return result;
        } catch (err) {
            logger.error(err);
            return null;
        }
    }

    static async groupAlerts(area, precisionPoint, precisionBbox, generateImages) {
        logger.info('Generating groups with area', area);
        if (!area.geostore) {
            area.geostore = await AlertService.getGeostoreByWdpa(area.wdpaid);
            await area.save();
        }

        try {
            const viirs = await AlertService.getViirs(area, precisionPoint);
            const glad = await AlertService.getGlad(area, precisionPoint);
            const groups = AlertService.groupPoints(viirs ? viirs.data : [], glad ? glad.data : [], precisionBbox);
            return await AlertService.obtainImages(groups, generateImages);
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

}

module.exports = AlertService;
