const {body, validationResult} = require('express-validator');

//---Helper για διαχειριση σφαλματων---
//Αυτο το βαζουμε στο τέλος καθε ελέγχου για να επιστρέφει το error αν υπαρχει
const handleValidationErrors = (req, res, next) =>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        //Επιστρέφουμε το πρώτο σφάλμα που βρέθηκε για να ειναι ξεκάθαρο στο frontend
        return res.status(400).json({error: errors.array()[0].msg});
    }
    next();
};

//---Report Validation---
const validateReport = [
    body('crew_id')
        .isInt().withMessage('Invalid Crew ID'),
    
        body('message')
            .trim()
            .notEmpty().withMessage('Message cannot be empty')
            .isLength({max: 1000}).withMessage('Message too long (max 1000 chars'),

        handleValidationErrors
];

//---Crew Submission Validation ---
const validateCrew = [
    //1. Απλα Text Fields -> Sanitization + Length Limit
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({max:100}).withMessage('Title cannot exceed 100 chars'),

    body('user_name')
        .trim()
        .notEmpty().withMessage('User name is required')
        .isLength({max:50}).withMessage('User name too long'),
    
    body('video_url')
        .optional({checkFalsy: true})
        .trim()
        .isURL().withMessage('Invalid Video URL'),
    
        //2. IDs-> type Check
    body('stage_id')
        .isInt().withMessage('Invalid Stage ID'),

    body('guide_type')
        .isIn(['video', 'text']).withMessage('Invalid Guide Type'),
    

    //3. Complex Objects -> type check μονο (δεν κανουμε escape για να μην χαλασει το json)
    body('crew_data')
        .isObject().withMessage('Invalid crew structure')
        .custom((value)=> {
            if(Object.keys(value).length === 0) throw new Error('Crew data cannot be empty');
            return true;
        }),

    body('text_guide_details')
    .optional({nullable: true})
    .isObject().withMessage('Invalid text guide format'),

    handleValidationErrors
];

const validateBanner = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required'),

    body('image_url')
        .trim()
        .notEmpty().withMessage('Image URL is required'),
    
    body('start_date')
        .trim()
        .isISO8601().withMessage('Invalid start date format'),
    
    body('end_date')
        .isISO8601().withMessage('Invalid end date format'),

    body('data_json')
        .custom((value) => {
            if (!value) throw new Error('Data JSON is required');

            if(typeof value === 'object') return true;

            try{
                JSON.parse(value);
                return true;
            } catch (e){
                throw new Error('Invalid JSON format in data_json');
            }
        }),
        handleValidationErrors
]

module.exports = {
    validateReport,
    validateCrew,
    validateBanner
};