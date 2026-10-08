import fs from 'fs';
import http from 'http';
import https from 'https';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

import config from './config.mjs';
import routes from './controllers/routes.mjs';
import { sendError } from './utils/errors.mjs';

const Server = class Server {
  constructor() {
    this.app = express();
    this.config = config[process.argv[2]] || config.developement;
  }

  async dbConnect() {
    try {
      const host = this.config.mongodb;

      this.connect = await mongoose.createConnection(host).asPromise();

      const close = async () => {
        try {
          await this.connect.close();
          console.log('[CLOSE] api dbConnect() close() -> mongodb closed');
        } catch (error) {
          console.error('[ERROR] api dbConnect() close() -> mongodb error', error);
        }
      };

      this.connect.on('error', (err) => {
        console.log('[ERROR] api dbConnect() -> mongodb error', err.message);
      });

      this.connect.on('disconnected', () => {
        console.log('[ERROR] api dbConnect() -> mongodb disconnected');
      });

      process.on('SIGINT', async () => {
        await close();
        process.exit(0);
      });

      console.log('[OK] api dbConnect() -> mongodb connected');
      return this.connect;
    } catch (err) {
      console.error(`[ERROR] api dbConnect() -> ${err.message}`);
      throw err;
    }
  }

  security() {
    // Headers HTTP de sécurité
    this.app.use(helmet());

    // Origines autorisées
    this.app.use(cors({ origin: this.config.corsOrigin }));

    // 100 requêtes max par IP toutes les 15 minutes
    this.app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 100,
        message: { code: 429, message: 'Too many requests' }
      })
    );
  }

  middleware() {
    this.app.use(express.json({ limit: '10kb' }));

    this.app.use((req, res, next) => {
      if (!req.body) req.body = {};
      next();
    });
  }

  routes() {
    Object.values(routes).forEach((Controller) => {
      new Controller(this.app, this.connect, this.config);
    });

    // Route inconnue
    this.app.use((req, res) => {
      res.status(404).json({
        code: 404,
        message: 'Not Found'
      });
    });

    this.app.use((err, req, res, next) => {
      sendError(res, err);
    });
  }

  listen() {
    const { port, ssl } = this.config;

    // HTTPS si un certificat est configuré, sinon HTTP
    if (ssl.key && ssl.cert && fs.existsSync(ssl.key) && fs.existsSync(ssl.cert)) {
      const options = {
        key: fs.readFileSync(ssl.key),
        cert: fs.readFileSync(ssl.cert)
      };
      https.createServer(options, this.app).listen(port, () => {
        console.log(`[OK] api run() -> https://localhost:${port}`);
      });
    } else {
      http.createServer(this.app).listen(port, () => {
        console.log(`[OK] api run() -> http://localhost:${port}`);
      });
    }
  }

  async run() {
    try {
      await this.dbConnect();
      this.security();
      this.middleware();
      this.routes();
      this.listen();
    } catch (err) {
      console.error(`[ERROR] Server -> ${err.message}`);
      process.exit(1);
    }
  }
};

export default Server;
