const getUUID = () => Math.random().toString(36).substring(7);

const createArea = (anotherData = {}) => ({
    application: 'gfw',
    name: 'SA',
    geostore: '258ef3125a382157453b26176a1320a9',
    userId: '5c0fc2b9d9b658cbf834094f',
    datasets: [],
    image: '',
    createdAt: new Date(),
    wdpaid: 1,
    templateId: 'updatedTemplateId',
    ...anotherData
});

module.exports = {
    createArea,
    getUUID
};
