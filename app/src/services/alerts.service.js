const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');
const config = require('config');
const geohash = require('ngeohash');
const Mustache = require('mustache');
const templateImage = require('./template-image.json');
const request = require('request-promise');

const POINTS = `WITH data AS (SELECT '{{{geojson}}}'::json AS fc) SELECT  ST_TRANSFORM(ST_SETSRID(ST_AsText(ST_GeomFromGeoJSON(feat->>'geometry')), 4326),3857) AS the_geom_webmercator, (feat->'properties'->'count')::text::INTEGER as count FROM (  SELECT json_array_elements(fc->'features') AS feat  FROM data) AS f`;

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
                    count: group[i].count
                }
            })
        }
        return JSON.stringify(data).replace(/"/g, '\\"');
    }

    static groupPoints(data, precissionBbox) {
        logger.debug('Group points', data, ' and preccisionbbox ', precissionBbox);
        const result = {};
        if (data) {
            for (let i = 0, length = data.length; i < length; i++) {
                const substring = data[i].geohash.substring(0, precissionBbox);
                if (!result[substring]) {
                    result[substring] = {
                        points: []
                    };
                }
                result[substring].points.push(data[i]);
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
                    let url = `http://wri-01.cartodb.com/api/v1/map/static/bbox/${layergroupid}/${groups[keys[i]].bbox.join(', ')}/700/450.png`;
                    
                    response.push({
                        geohash: keys[i],
                        count: groups[keys[i]].points ? groups[keys[i]].points.reduce((a, b) => ({count: a.count + b.count})).count : 0,
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

    static async groupAlerts(area, precissionPoint, precissionBbox)  {
        logger.info('Generating groups with area', area);
        const gladDataset = config.get('gladDataset');
        let uri = `/query/${gladDataset}?sql=select count(*) as count from data group by ST_GeoHash(the_geom_point, ${precissionPoint})&geostore=${area.geostore}`;
        try {
            const result = await ctRegisterMicroservice.requestToMicroservice({
                uri,
                method: 'GET',
                json: true
            });
            const groups = AlertService.groupPoints(result.data, precissionBbox);
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
