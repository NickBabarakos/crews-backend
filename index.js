require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const os = require('os');

const homeRoutes = require('./routes/homeRoutes');
const stageRoutes = require('./routes/stageRoutes');
const characterRoutes = require('./routes/characterRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const crewRoutes = require('./routes/crewRoutes');
const userBoxRoutes = require('./routes/userBoxRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
app.set('trust proxy', 1);
app.use(compression());
app.use(helmet());

const allowedOrigins = [
    'http://localhost:3000',// Για δοκιμες backend τοπικα
    'http://localhost:3001', //Για δοκιμες frontend τοπικα 
    process.env.FRONTEND_URL //Το URL του Vercel
];

app.use(cors({
    origin: function (origin, callback){
        if(!origin || allowedOrigins.indexOf(origin) !== -1){
            callback(null, true);
        } else{
            console.warn(`Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by Cors'))
        }
    }
}));

//Rate Limiters Definitions
const generalLimiter = rateLimit({
    windowMs: 15*60*1000,
    max: 200,
    message: {error: 'Too many requests, please try again later.'}
});

const loginLimiter = rateLimit({
    windowMs: 15*60*1000,
    max: 5,
    message: {error: 'Too many login attempts. Blocked for 15 minutes'}
});

const submissionLimiter = rateLimit({
    windowMs: 60*60*1000,
    max: 30,
    message: {error: 'Submission limit reached. You can upload up to 30 items per hour.'}
});


app.use(express.json({limit: '5mb'}));

app.use('/api/admin/login', loginLimiter);

app.use('/api/crews/submit', submissionLimiter);
app.use('/api/box/create', submissionLimiter);
app.use('/api/box/update', submissionLimiter);

app.use('/api', generalLimiter);

app.use('/api/home', homeRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/crews', crewRoutes);
app.use('/api/box', userBoxRoutes);
app.use('/api/reports',reportRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({error: 'Internal Server Error'});
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    const interfaces = os.networkInterfaces();
    let networkIp = 'localhost';

    for(const name of Object.keys(interfaces)){
        for(const iface of interfaces[name]){
            if(iface.family === 'IPv4' && !iface.internal){
                networkIp = iface.address;
                break;
            }
        }
    }
    console.log('App running on:');
    console.log(`-Local: http://localhost:${PORT}`);
    console.log(`-Network: http://${networkIp}:${PORT}`);
}
);
