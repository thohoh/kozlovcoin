import {TLogger} from "./logger";

export const TRequestLogger = Symbol('RequestLogger');

export const requestLoggerProvider = {
    token: TRequestLogger,
    useFactory: (logger) => {
        return function (req, res, next) {
            logger.log(`${req.protocol} ${req.method} ${req.originalUrl}`);

            if (req.method === 'POST' | req.method === 'PUT') {
                logger.log(JSON.stringify(req.body));
            }

            next();
        }
    },
    inject: [TLogger]
};
