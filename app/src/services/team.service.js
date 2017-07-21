const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');

class TeamService {

    static async getTeamByUserId(userId) {
        logger.info('Get team by user id');
        const team = await ctRegisterMicroservice.requestToMicroservice({
            uri: '/teams/user/' + userId,
            method: 'GET',
            json: true
        });
        if (!team || !team.data) return null;
        return Object.assign({}, team.data.attributes, { id: team.data.id });
    }
    static async patchTeamById(teamId, body) {
        logger.info('Get team by user id');
        const team = await ctRegisterMicroservice.requestToMicroservice({
            uri: '/teams/' + teamId,
            method: 'PATCH',
            body,
            json: true
        });
        return Object.assign({}, team.data.attributes, { id: team.data.id });
    }
}
module.exports = TeamService;
