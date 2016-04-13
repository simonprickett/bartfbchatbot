"use strict";

/* bartfbchatbot.js */

var express = require('express');
var httpRequest = require('request');
var app = express();
var http = require('http');
var bodyParser = require('body-parser');
var port = process.env.PORT || 8888;
var pageAccessToken = 'EAAH1qgWqeVEBALbEww265oEoPSohFCAHiIAe1pd0fZBJyyZBpkwD5KFVtAVAnplTUlYPeEczbR8r9yPRka49yGvaPGOYl2WdzHH46nebryGuSJlS3WJ4Ghc2dOmfsc35nc5yuthx15QuS1UO5ZAfykXYniPYstZCPQBg4IZA2VQZDZD';
var BART_API_BASE = 'http://bart.crudworks.org/api';

function processMessage(sender, reqText) {
    var respText = 'Sorry I don\'t know that, try\nstations\ndepartures <stationCode>';

    reqText = reqText.trim();

    if (reqText.indexOf('stations') > -1) {
        httpRequest({
            url: BART_API_BASE + '/stations',
            method: 'GET'
        }, function(error, response, body) {
            var stations,
                n = 0;

            if (! error && response.statusCode === 200) {
                stations = JSON.parse(body);
                console.log(stations);
                respText = 'Ask me for departures for any of ';

                for (; n < stations.length; n++) {
                    respText += stations[n].abbr + ', ';
                }

                console.log(respText);
                respText = respText.substring(0, respText.length - 2);
            } else {
                respText = 'Sorry something happened: ' + error;
            }

            console.log(respText);
            sendTextMessage(sender, respText);
        });
    } else {
        // Unknown command
        console.log(respText);
        sendTextMessage(sender, respText);
    }
}

function sendTextMessage(sender, text) {
    var messageData = {
        text: text
    };

    httpRequest({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: pageAccessToken},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

app.set('port', port);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/test', function(req, res) {
    processMessage('simon', 'what news of the stations?');
});

app.get('/', function(req, res) {
    res.send('BART Facebook Chatbot.');
});

app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'lets_talk_mass_trans1t') {
        res.send(req.query['hub.challenge']);
    }
    res.send('Error, wrong validation token');
});

app.post('/webhook/', function (req, res) {
    var messaging_events = req.body.entry[0].messaging, 
        i = 0,
        event,
        sender,
        text;

    for (; i < messaging_events.length; i++) {
        event = req.body.entry[0].messaging[i];
        sender = event.sender.id;
        if (event.message && event.message.text) {
            text = event.message.text;
            processMessage(sender, text);
        }
    }

    res.sendStatus(200);
});

http.createServer(app).listen(port);
console.log('bartcfchatbot listening on port ' + port);
module.exports = app;