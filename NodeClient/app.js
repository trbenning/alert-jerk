var azure = require("azure");
//var say = require("say");
var winsay = require("winsay");

function checkForMessages(sbService, queueName, callback) {
    sbService.receiveQueueMessage(queueName, { isPeekLock: true }, function (err, lockedMessage) {
        if (err) {
            if (err === "No messages to receive") {
                console.log("No messages");
            } else {
                callback(err);
            }
        } else {
            callback(null, lockedMessage);
        }
    });
}

function tellItLikeItIs(message) {
    //say.speak(message);
    winsay.speak(null, message, function(error, result) {
        if (error) {
            console.log("Failed to tell it like it is ", error);
        }
    });
}

function processBuildCompleted(build) {

    var res = build.resource;
    if (res.status !== "failed") {
        return;
    }

    var name = res.requests[0].requestedFor.displayName;

    tellItLikeItIs("God dammit " + name + "! You broke the build again.");
}

function processMessage(sbService, err, lockedMsg) {
    if (err) {
        console.log("Error on Rx: ", err);
        if (lockedMsg) {
            console.log("Message will be unlocked.");
            sbService.unlockMessage(lockedMsg, function(err2) {
                console.log("Failed to unlock message: ", err2);
            });
        }
    } else {
        console.log("Rx: ", lockedMsg);
        processBuildCompleted(JSON.parse(lockedMsg.body));
        sbService.deleteMessage(lockedMsg, function (err2) {
            if (err2) {
                console.log("Failed to delete message: ", err2);

            } else {
                console.log("Deleted message.");
            }
        });
    }
}

var idx = 0;
function sendMessages(sbService, queueName) {
    var msg = "Message # " + (++idx);
    sbService.sendQueueMessage(queueName, msg, function (err) {
        if (err) {
            console.log("Failed Tx: ", err);
        } else {
            console.log("Sent " + msg);
        }
    });
}

var connStr = process.argv[2] || "Endpoint=sb://buildalerts.servicebus.windows.net/;SharedAccessKeyName=FullAccess;SharedAccessKey=dnAjDUay6qn/x9X06dJbbz1F4O5dBJ0GcV86BTj9O5g=";
if (!connStr) throw new Error("Must provide connection string");
var queueName = "failedbuilds";

winsay.speak(null, "Hello. Let's get started.");

console.log("Connecting to " + connStr + " queue " + queueName);
var sbService = azure.createServiceBusService(connStr);
sbService.createQueueIfNotExists(queueName, function (err) {
    if (err) {
        console.log("Failed to create queue: ", err);
    } else {
        setInterval(checkForMessages.bind(null, sbService, queueName, processMessage.bind(null, sbService)), 5000);
        //setInterval(sendMessages.bind(null, sbService, queueName), 15000);
    }
});