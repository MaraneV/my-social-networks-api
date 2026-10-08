export default {
  developement: {
    type: 'developement',
    port: 3000,
    mongodb: 'mongodb://127.0.0.1:27017/my_social_networks',
    jwtSecret: 'cle_secrete_de_developpement_a_changer',
    jwtExpiresIn: '1h',
    corsOrigin: 'http://localhost:3000',
    ssl: {
      key: '',
      cert: ''
    }
  },
  production: {
    type: 'production',
    port: 3000,
    mongodb: process.env.MONGODB_URI || '',
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: '1h',
    corsOrigin: process.env.CORS_ORIGIN || '',
    ssl: {
      key: './certs/key.pem',
      cert: './certs/cert.pem'
    }
  }
};
