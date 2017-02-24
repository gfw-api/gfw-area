const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');
const config = require('config');
const geohash = require('ngeohash');
const Mustache = require('mustache');
const templateImage = require('./template-image.json');
const request = require('request-promise');

const POINTS = `WITH data AS (SELECT '{{{geojson}}}'::json AS fc) SELECT  ST_TRANSFORM(ST_SETSRID(ST_AsText(ST_GeomFromGeoJSON(feat->>'geometry')), 4326),3857) AS the_geom_webmercator, (feat->'properties'->>'count')::INTEGER as count, (feat->'properties'->>'type')::text as type FROM (  SELECT json_array_elements(fc->'features') AS feat  FROM data) AS f`;

class AlertService {

    static convert2Geojson(group) {
        logger.debug('Convert to geojson group ->');
        let data = {
            type: 'FeatureCollection',
            features: []
        }
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
            })
        }
        return JSON.stringify(data).replace(/"/g, '\\"');
    }

    static groupPoints(dataViirs, dataGlad, precissionBbox) {
        logger.debug('Group points', ' and preccisionbbox ', precissionBbox);
        const result = {};
        if (dataViirs) {
            for (let i = 0, length = dataViirs.length; i < length; i++) {
                const substring = dataViirs[i].geohash.substring(0, precissionBbox);
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
            for (let i = 0, length = dataGlad.length; i < length; i++) {
                const substring = dataGlad[i].geohash.substring(0, precissionBbox);
                if (!result[substring]) {
                    result[substring] = {
                        points: []
                    };
                }
                dataGlad[i].type = 'glad';
                result[substring].points.push(dataGlad[i]);
            }
        }
        let keys = Object.keys(result);
        for (let i = 0, length = keys.length; i < length; i++) {
            result[keys[i]].geojson = AlertService.convert2Geojson(result[keys[i]].points);
            const bbox = geohash.decode_bbox(keys[i]);
            // long, lat (lower) long, lat upper
            result[keys[i]].bbox = [bbox[1], bbox[0],bbox[3],bbox[2]];
            result[keys[i]].query = Mustache.render(POINTS, {
                geojson: result[keys[i]].geojson
            });
            result[keys[i]].template = Mustache.render(JSON.stringify(templateImage), {
                query: result[keys[i]].query
            }).replace(/\s\s+/g, ' ').trim();
        }
        return result;
    }

    static async obtainImages(groups) {
        logger.debug('Obtaining images with gropus');
        const response = [];
        if (groups) {
            let keys = Object.keys(groups);
            for (let i = 0, length = keys.length; i < length; i++) {
                try {
                    let result = await request({
                        url: 'https://wri-01.cartodb.com/api/v1/map',
                        method: 'POST',
                        body: groups[keys[i]].template,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    let layergroupid = JSON.parse(result).layergroupid;
                    let url = `http://wri-01.cartodb.com/api/v1/map/static/bbox/${layergroupid}/${groups[keys[i]].bbox.join(', ')}/700/700.png`;
                    let countViirs = 0;
                    let countGlad = 0;
                    groups[keys[i]].points.map((p) => {
                        if(p.type === 'glad'){
                            countGlad += p.count;
                        } else {
                            countViirs += p.count;
                        }
                    });
                    response.push({
                        geohash: keys[i],
                        countGlad,
                        countViirs,
                        url,
                        bbox: groups[keys[i]].bbox,
                        // query: groups[keys[i]].query
                    });
                } catch (err) {
                    logger.error('Error obtaining image to key ', keys[i], err);
                }
            }
        }
        return response;
    }

    static async getGeostoreByWdpa(wdpaid) {
        logger.debug('Obtaining geostore of wdpaid ', wdpaid);
        try {
            const result = await ctRegisterMicroservice.requestToMicroservice({
                    uri: `/geostore/wdpa/${wdpaid}`,
                    method: 'GET',
                    json: true
                });
            return result.data.id;
        } catch(err) {
            if (err.statusCode === 404) {
                throw new Error('Wdpa not found');
            }
        }

    }

    static async getViirs(area, precissionPoint) {
        logger.debug('Obtaining data of viirs');
        const viirsDataset = config.get('viirsDataset');
        const table = config.get('viirsDatasetTableName');
        let uri = `/query/${viirsDataset}?sql=select count(*) as count, ST_GeoHash(the_geom, ${precissionPoint}) as geohash from ${table} where acq_date > '2017-01-01' group by ST_GeoHash(the_geom, ${precissionPoint})&geostore=${area.geostore}`;
        try {
            const result = await ctRegisterMicroservice.requestToMicroservice({
                uri,
                method: 'GET',
                json: true
            });
            return result;
        } catch (err) {
            logger.error(err);
            return null;
        }
    }

    static async getGlad(area, precissionPoint) {
        logger.debug('Obtaining data of glad');
        const gladDataset = config.get('gladDataset');
        let uri = `/query/${gladDataset}?sql=select count(*) as count from data where year > 2016 group by ST_GeoHash(the_geom_point, ${precissionPoint})&geostore=${area.geostore}`;
        try {
            const result = await ctRegisterMicroservice.requestToMicroservice({
                uri,
                method: 'GET',
                json: true
            });
            return result;
        } catch (err) {
            logger.error(err);
            return null;
        }
    }

    static async groupAlerts(area, precissionPoint, precissionBbox)  {
        logger.info('Generating groups with area', area);
        let geostore = area.geostore;
        if (!area.geostore){
            area.geostore = await AlertService.getGeostoreByWdpa(area.wdpaid);
            await area.save();
        }
        
        try {
            const viirs = await AlertService.getViirs(area, precissionPoint);
            const glad = await AlertService.getGlad(area, precissionPoint);
            logger.debug('Virrs data', viirs, viirs.data);
            logger.debug('Glad data', glad, glad.data);
            const groups = AlertService.groupPoints(viirs ? viirs.data: [], glad ? glad.data: [], precissionBbox);
            const response = await AlertService.obtainImages(groups);
            return response;
        } catch (err) {
            logger.error(err);
            throw err;
        }

        return {};
    }
}

module.exports = AlertService;
