var express = require('express');
var router = express.Router();
var ObjectId = require('mongodb').ObjectID;
var mc = require('mongodb').MongoClient;
var db, logsCollection;

var multer  = require('multer')
var storage = multer.memoryStorage()
var upload = multer({ storage: storage })

var connectCallback = function(err, returnedDB) {
    if (err) {
        throw err;
    }

    db = returnedDB;
    
    logsCollection = db.collection('logs');
}

mc.connect('mongodb://localhost/log-demo', connectCallback);


router.get('/', function(req, res) {
    res.render('index', {title: 'COMP 2406 Log Analysis & Visualization'});
});


router.get('/count', function(req, res) {

    function reportCount(err, count) {
        if (err) {
            res.sendStatus(500);
        } else {
            res.send({count: count});
        }
    }

    logsCollection.count({}, reportCount);
});

router.get('/storedFileCount', function(req, res) {

    function reportStoredFiles(err, files) {
        if (err) {
            res.sendStatus(500);
        } else {
            res.send({count: files.length});
        }
    }

    logsCollection.distinct("file", reportStoredFiles);
});

function doQuery(req, res) {
    var fields = ['message', 'service', 'file', 'month', 'day'];
    var query = {};
    var count = parseInt(req.body.count);

    if (isNaN(count) || count < 0) {
        count = 0;
    }
    
    function returnQuery(err, theLogs) {
        if (err) {
            res.sendStatus(500);
        } else {
            res.send(theLogs);
        }
    }

    fields.forEach(function(f) {
        if (req.body[f] && req.body[f] !== '') {
            // Should probably do some sanitization here
            query[f] = {$regex: req.body[f]};
        }
    });
    
    logsCollection.find(query).limit(count).toArray(returnQuery);
}
router.post('/doQuery', doQuery);

function uploadLogfile(req, res) {
    var theFile = req.file;
    var lines;
    var entries = [];
    var i, j, entry, field;

    function returnResult(err, result) {
        if (err) {
            res.sendStatus(500);
        } else {
            res.send({count: result.insertedCount});
        }
    }
    
    if (theFile) {
        
        lines = theFile.buffer.toString('utf8').split('\n');

        for (i=0; i<lines.length; i++) {
            if (lines[i] && lines[i] !== '') {
                field = lines[i].split(' ');
                entry = {};
                j = 0;
                while (j < field.length) {
                    if (field[j] === "") {
                        field.splice(j, 1);
                    } else {
                        j++;
                    } 
                }
                entry.month = field[0];
                entry.day = field[1];
                entry.time = field[2];
                entry.host = field[3];
                entry.service = field[4].slice(0,-1);
                entry.message = field.slice(5).join(' ');
                entry.file = theFile.originalname;
                entry.count = i;
                entries.push(entry);
            }
        }
        
        logsCollection.insert(entries, returnResult);
    } else {
        res.sendStatus(500);
    }
}

router.post('/uploadLog', upload.single('theFile'), uploadLogfile);

module.exports = router;
