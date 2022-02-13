// Load Environment variables
require('dotenv').load();

// paystack module is required to make charge token call
var paystack = require('paystack')('sk_test_7dc4187b7e2bb6084d9daabbe3a155b5d21a18bd');

// uuid module is required to create a random reference number
var uuid     = require('node-uuid');

var express =  require('express');
var app = require('express')();
var bodyParser = require('body-parser');

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({   // to support URL-encoded bodies
    extended: true
}));

app.get('/', function(req, res) {
res.send('<body><head><link href="favicon.ico" rel="shortcut icon" />\
    </head><body><h1>Awesome!</h1><p>Your server is set up. \
    Go ahead and configure your Paystack sample apps to make calls to: \
    <ul><li> <a href="#">https://'+req.headers.host+'</a></li></ul> \
    </p></body></html>');
});

app.get('/new-access-code', function(req, res) {
    var email     = req.params.email;
    let amount     = req.params.amount;
    // you can then look up customer and cart details in a db etc
    // I'm hardcoding an email here for simplicity
    amountinkobo = amount * 100;
    if(isNaN(amountinkobo) || (amountinkobo < 2500)){
        amountinkobo = 2500;
    }

    // all fields supported by this call can be gleaned from
    // https://developers.paystack.co/reference#initialize-a-transaction
    paystack.transaction.initialize({
        email:     email,        // a valid email address
        amount:    amountinkobo, // only kobo and must be integer
        metadata:  {
            custom_fields:[
                {
                    "display_name":`Started From ${email}`,
                    "variable_name":`started_from_${email}`,
                    "value":"charge bannk backend"
                },
                {
                    "display_name":"Requested by Avenride Inc.",
                    "variable_name":"requested_by_avenride",
                    "value": req.headers['user-agent']
                },
                {
                    "display_name":"Avenride Inc",
                    "variable_name":"Avenride Inc",
                    "value": req.headers.host
                }
            ]
        }
    },function(error, body) {
        if(error){
            res.send({error:error});
            return;
        }
        res.send(body.data.access_code);
    });
});

app.get('/verify/:reference', function(req, res) {
    var reference = req.params.reference;

    paystack.transaction.verify(reference,
        function(error, body) {
        if(error){
            res.send({error:error});
            return;
        }
        if(body.data.success){
            // save authorization
            var auth = body.authorization;
        }
        res.send(body.data);
    });
});

//The 404 Route (ALWAYS Keep this as the last route)
app.get('/*', function(req, res){
    res.status(404).send('Only GET /new-access-code \
        or GET /verify/{reference} is allowed');
});
module.exports = app;