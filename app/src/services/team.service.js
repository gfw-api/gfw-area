const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

class TeamService {

    static async getTeamByUserId(userId) {
        logger.info('Get team by user id', userId);
        const team = await RWAPIMicroservice.requestToMicroservice({
            uri: `/v1/teams/user/${userId}`,
            method: 'GET',
        });
        if (!team || !team.data) return null;
        return { ...team.data.attributes, id: team.data.id };
    }

    static async patchTeamById(teamId, body) {
        logger.info('Get team by user id');
        const team = await RWAPIMicroservice.requestToMicroservice({
            uri: `/v1/teams/${teamId}`,
            method: 'PATCH',
            body,
        });
        return { ...team.data.attributes, id: team.data.id };
    }

}

module.exports = TeamService;
