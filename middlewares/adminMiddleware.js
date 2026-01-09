const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
    //1. Παιρνουμε το header 'Authorization'
    const authHeader = req.headers['authorization'];
    //2. Το format ειναι "Bearer Token" , οποτε παιρνουμε το δεύτερο κομματι
    const token = authHeader && authHeader.split(' ')[1];

    if(!token){
        return res.status(401).json({error: 'Unauthorized: no token provided'});
    }

    try{
        //3. Ελέγχουμε αν το token ειναι γνησιο και δεν εχει λήξει
        jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err){
        return res.status(403).json({error: 'Unauthorized: Invalid or Expired Token'});
    }
};

module.exports = { adminAuth};