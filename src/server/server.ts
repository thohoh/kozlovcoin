import { INestApplication } from '@nestjs/common';

import * as express from 'express';
import * as bodyParser from 'body-parser';

import { IServer } from './server.interface';
import { Express } from 'express';
import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from '../application/application.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { configuration } from '../system/configuration';
import { IConfiguration } from '../system/configuration.interface';
import { consoleLogger } from '../system/logger/lib/console-logger';
import { ILogger, TLogger } from '../system/logger/interfaces/logger.interface';
import { SystemModule } from '../system/system.module';
import { LoggerModule } from '../system/logger/lib/logger.module';

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

        this.nestApp = await NestFactory.create(ApplicationModule, this.app);

        let systemModule  = this.nestApp.select(LoggerModule);
        this.logger = systemModule.get(TLogger);

        this.setupApiDocs(this.nestApp);
    }

    async start(): Promise<void> {
        await this.nestApp.listen(this.config.server.port, this.config.server.host);

        this.logger.info(`Server is listening on ${this.config.server.host}:${this.config.server.port}`);
    }

    async stop(): Promise<void> {
        this.nestApp.close();

        this.logger.info(`Server is closed`);
    }

    public getHttpServerInstance(): Express {
        return this.nestApp.getHttpServer();
    }

    private setupMiddleware(app) {
        app.use(bodyParser.json({limit: '50mb'}));
        app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));
    }

    private setupApiDocs(nestApp: INestApplication): void {
        const options = new DocumentBuilder()
            .setTitle('Cats example')
            .setDescription('The cats API description')
            .setVersion('1.0')
            .addTag('cats')
            .build();

        const document = SwaggerModule.createDocument(nestApp, options);
        SwaggerModule.setup('/api', nestApp, document);
    }
}