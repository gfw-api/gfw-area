const logger = require('logger');
const GeostoreNotFound = require('errors/geostore-not-found.error');
const rimraf = require('rimraf');
const ctRegisterMicroservice = require('ct-register-microservice-node');
const tilebelt = require('@mapbox/tilebelt');
const tmp = require('tmp');
const fs = require('fs');
const zipFolder = require('zip-folder');
const request = require('request');

const CONCURRENCY = 30;

class DownloadService {

    static async getBBox(geostoreId) {
        try {
            const result = await ctRegisterMicroservice.requestToMicroservice({
                uri: `/geostore/${geostoreId}`,
                method: 'GET',
                json: true
            });
            return result.data.attributes.bbox;
        } catch (err) {
            logger.error(err);
            throw new GeostoreNotFound(`Geostore with id ${geostoreId} not found`);
        }
    }

    static calculateCoordinates(bbox, minZoom, maxZoom) {
        logger.debug('Calculating coordinates');
        const zooms = [];
        const tilesArray = [];
        logger.debug(minZoom, maxZoom);
        for (let i = minZoom; i <= maxZoom; i++) {
            logger.debug('asdfadfa');
            zooms.push(i);
        }
        logger.debug('zooms', zooms);
        zooms.forEach((zoom) => {
            const pointTiles = [];
            pointTiles.push(tilebelt.pointToTile(bbox[0], bbox[1], zoom));
            pointTiles.push(tilebelt.pointToTile(bbox[2], bbox[3], zoom));
            logger.debug(pointTiles);
            const tiles = {
                x: [Math.min(pointTiles[0][0], pointTiles[1][0]), Math.max(pointTiles[0][0], pointTiles[1][0])],
                y: [Math.min(pointTiles[0][1], pointTiles[1][1]), Math.max(pointTiles[0][1], pointTiles[1][1])]
            };
            logger.debug('tiles', tiles);
            for (let x = tiles.x[0], xLength = tiles.x[1]; x <= xLength; x++) {
                for (let y = tiles.y[0], yLength = tiles.y[1]; y <= yLength; y++) {
                    tilesArray.push([x, y, zoom]);
                }
            }
        });

        return tilesArray;

    }

    static async downloadImage(layerUrl, z, x, y, tempDir, useExtension) {
        logger.debug('Downloading image ', layerUrl.replace('{z}', z).replace('{x}', x).replace('{y}', y));
        const url = layerUrl.replace('{z}', z).replace('{x}', x).replace('{y}', y);

        return new Promise((resolve, reject) => {
            request.get(url)
                .on('response', (res) => {
                    let filename = `${z}x${x}x${y}`;

                    if (useExtension) {
                        if (res.headers['content-type'] === 'image/png') {
                            filename += '.png';
                        } else {
                            filename += '.jpg';
                        }
                    }
                    const fws = fs.createWriteStream(`${tempDir}/${filename}`);
                    // setup piping
                    res.pipe(fws);
                    res.on('end', () => {
                        resolve();
                    });
                    res.on('error', () => {
                        reject();
                    });
                });
        });
    }

    static async zipFolder(folder, zipDir) {
        logger.debug(`Zipping folder ${folder}`);
        return new Promise((resolve, reject) => {
            zipFolder(folder, zipDir, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

    }

    static async removeFolder(path) {
        return new Promise((resolve, reject) => {
            rimraf(path, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    static async downloadAndZipCoordinates(coordinates, layerUrl, useExtension) {
        logger.debug('Downloading coordinates', coordinates);
        const tmpobj = tmp.dirSync();
        const tmpDownload = tmp.dirSync();
        let promises = [];
        try {
            for (let i = 0, { length } = coordinates; i < length; i++) {
                promises.push(DownloadService.downloadImage(layerUrl, coordinates[i][2], coordinates[i][0], coordinates[i][1], tmpobj.name, useExtension));
                if (promises.length === CONCURRENCY) {
                    await Promise.all(promises);
                    promises = [];
                }
            }
            if (promises.length > 0) {
                await Promise.all(promises);
                promises = null;
            }
            // eslint-disable-next-line no-empty
        } catch (err) {}
        await DownloadService.zipFolder(tmpobj.name, `${tmpDownload.name}/download.zip`);
        logger.info('Removing file ', tmpobj.name);
        await DownloadService.removeFolder(tmpobj.name);
        return `${tmpDownload.name}/download.zip`;
    }

    static async getTilesZip(geostoreId, minZoom, maxZoom, layerUrl, useExtension = true) {
        const bbox = await DownloadService.getBBox(geostoreId);
        const coordinates = DownloadService.calculateCoordinates(bbox, minZoom, maxZoom);
        logger.debug('Coordinates', coordinates);
        return DownloadService.downloadAndZipCoordinates(coordinates, layerUrl, useExtension);
    }

}

module.exports = DownloadService;
