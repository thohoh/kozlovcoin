/* tslint:disable:no-string-literal */

import { Component } from '@nestjs/common';
import { EnvType, IEnvironment } from './environment.interface';

@Component()
export class Environment implements IEnvironment {
    public config = <EnvType> process.env['ENV_CONFIG'];
    public mode = <EnvType> process.env['ENV_MODE'];
    public serverHost = process.env['HOST'];
    public serverPort = process.env['PORT'] ? +(process.env['PORT']) : null;
    public p2pHost = process.env['P2P_HOST'];
    public p2pPort = process.env['P2P_PORT'] ? +(process.env['P2P_PORT']) : null;
    public p2pPeers = process.env['P2P_PEERS'];
}

export const environment: IEnvironment = new Environment();