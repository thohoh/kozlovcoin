import { INestApplication } from '@nestjs/common';

import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';

import { IServer } from './server.interface';
import { Express } from 'express';
import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from '../application/application.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { configuration } from '../system/configuration';
import { IConfiguration } from '../system/configuration.interface';
import { ILogger, TLogger } from '../system/logger/interfaces/logger.interface';
import { LoggerModule } from '../system/logger/lib/logger.module';
import { ValidationPipe } from '../application/api/validation/validation-pipe';
import { HttpExceptionFilter } from '../application/api/exceptions/http-exception-handler';

export class Server implements IServer {
    private app: Express;
    private nestApp: INestApplication;
    private config: IConfiguration;
    private logger: ILogger;

    constructor() {
        this.config = configuration;
    }

    public async init() {
        this.app = express();
        this.setupMiddleware(this.app);

        // if (environment.mode === 'test') {
        //    Logger.setMode(NestEnvironment.TEST);
        // }

        this.nestApp = await NestFactory.create(ApplicationModule, this.app);
        this.nestApp.useGlobalPipes(new ValidationPipe());
        this.nestApp.useGlobalFilters(new HttpExceptionFilter());

        this.logger  = this.nestApp.select(LoggerModule).get(TLogger);

        this.setupApiDocs(this.nestApp);
    }

    public async start(): Promise<void> {
        await this.nestApp.listen(this.config.server.port);

        this.logger.info(`Server is listening on ${this.config.server.host}:${this.config.server.port}`);
    }

    public async stop(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.nestApp.getHttpServer().close((arg) => {
                this.nestApp.close();
                this.logger.info(`Server is closed`);
                resolve();

            });
        });
    }

    public getHttpServerInstance(): Express {
        return this.nestApp.getHttpServer();
    }

    private setupMiddleware(app) {
        app.use(cors());
        app.use(bodyParser.json({limit: '50mb'}));
        app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));
    }

    private setupApiDocs(nestApp: INestApplication): void {
        const options = new DocumentBuilder()
            .setTitle('Kozlovcoin blockchain API Docs')
            .setDescription('')
            .setVersion('1.0')
            .build();

        const document = SwaggerModule.createDocument(nestApp, options);
        SwaggerModule.setup(this.config.server.apiDocsRoute, nestApp, document);
    }
}