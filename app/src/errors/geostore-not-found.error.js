class GeostoreNotFound extends Error {

    constructor(message) {
        super(message);
        this.name = 'GeostoreNotFound';
        this.message = message;
    }

}

module.exports = GeostoreNotFound;
