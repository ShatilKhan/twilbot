const rc = require('rc');
const config = rc('app');
const dialogflow = require("@google-cloud/dialogflow");
const express = require("express");

const app = express();
app.use(express.urlencoded({extended: true}));
const port = 3000;

const projectId = "jokes-wawp";

//create the twilioClient
const client = require("twilio")(
    config.TWILIO_API_KEY_SID,
    config.TWILIO_API_KEY_SECRET,
    {accountSid: config.TWILIO_ACCOUNT_SID}
   );

// Handle the communication between your Server and Dialogflow

async function sendToDialogflow(
    projectId,
    sessionId,
    query
) {
    const sessionClient = new dialogflow.SessionsClient();
    //  The path to identify the agent that owns the created intent.
    const sessionPath = sessionClient.projectAgentSessionPath(
        projectId,
        sessionId
    );

    // The text query request
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: query,
                languageCode: "en-US",
            },
        },
    };

    try {
        const responses = await sessionClient.detectIntent(request);
        return responses[0];
    } catch (err) {
        console.log("Dialogflow Error: ", err.message);
    }
    return false;
}


// Add the bot's response in the Conversation

async function sendToTwilio(response,  conversationSid ) {
    try {
        await client.conversations.v1.conversations(conversationSid)
                    .messages
                    .create({ author: 'system', body: response})
        return true;
    } catch (err) {
        console.log("Twilio Error: ", + err.message);
        return false;
    }
}


// Add an endpoint on the Server

app.post("/dialogflow", async (req, res) => {
    let sessionId = req.body.ConversationSid;
    let query = req.body.Body;

    let response = await (await sendToDialogflow(projectId, sessionId, query)).queryResult.fulfillmentText;
    if(!(response)) { res.status(500).send(); }

    let result = await sendToTwilio(response, sessionId);
    if(result) { res.status(201).send();}
    res.status(500).send();
})

app.listen(port, () => {
    console.log(`Dialogflow integration listening on port ${port}`);
})