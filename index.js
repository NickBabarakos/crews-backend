require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
app.use(cors());
app.use(express.json({limit: '50mb'}));

app.use('/api/home', homeRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/crews', crewRoutes);
app.use('/api/box', userBoxRoutes);
app.use('/api/reports',reportRoutes);
app.use('/api/admin', adminRoutes);


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
