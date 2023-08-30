/* eslint-disable max-len */
const USERS = {
    USER: {
        id: '1a10d7c6e0a37126611fd7a5',
        name: 'Test user',
        role: 'USER',
        provider: 'local',
        email: 'user@resourcewatch.org',
        extraUserData: {
            apps: [
                'rw',
                'gfw',
                'gfw-climate',
                'prep',
                'aqueduct',
                'forest-atlas',
                'data4sdgs'
            ]
        }
    },
    MANAGER: {
        id: '1a10d7c6e0a37126611fd7a6',
        name: 'Test manager',
        role: 'MANAGER',
        provider: 'local',
        email: 'user@resourcewatch.org',
        extraUserData: {
            apps: [
                'rw',
                'gfw',
                'gfw-climate',
                'prep',
                'aqueduct',
                'forest-atlas',
                'data4sdgs'
            ]
        }
    },
    ADMIN: {
        id: '1a10d7c6e0a37126611fd7a7',
        name: 'Test admin',
        role: 'ADMIN',
        provider: 'local',
        email: 'user@resourcewatch.org',
        extraUserData: {
            apps: [
                'rw',
                'gfw',
                'gfw-climate',
                'prep',
                'aqueduct',
                'forest-atlas',
                'data4sdgs'
            ]
        }
    },
    MICROSERVICE: {
        id: 'microservice',
        createdAt: '2016-09-14'
    }
};

module.exports = {
    USERS
};
