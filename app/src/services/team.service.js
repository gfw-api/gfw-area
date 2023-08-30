const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

class TeamService {

    static async getTeamByUserId(userId, apiKey) {
        logger.info('Get team by user id', userId);
        const team = await RWAPIMicroservice.requestToMicroservice({
            uri: `/v1/teams/user/${userId}`,
            method: 'GET',
            headers: {
                'x-api-key': apiKey
            }
        });
        if (!team || !team.data) return null;
        return { ...team.data.attributes, id: team.data.id };
    }

    static async patchTeamById(teamId, body, apiKey) {
        logger.info('Get team by user id');
        const team = await RWAPIMicroservice.requestToMicroservice({
            uri: `/v1/teams/${teamId}`,
            method: 'PATCH',
            body,
            headers: {
                'x-api-key': apiKey
            }
        });
        return { ...team.data.attributes, id: team.data.id };
    }

}

module.exports = TeamService;
