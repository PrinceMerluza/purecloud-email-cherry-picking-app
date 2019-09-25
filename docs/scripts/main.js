import view from './view.js';

const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;

// OAuth 
const redirectUri = window.location.href;
const clientId = "e7de8a75-62bb-43eb-9063-38509f8c21af";
const queueId = "9f7ae000-70ce-4afd-9bbd-746f5a4d7163";

// API instances
const analyticsApi = new platformClient.AnalyticsApi();
const conversationsApi = new platformClient.ConversationsApi();

client.loginImplicitGrant(clientId, redirectUri)
.then((data) => {
    console.log(data);

    // Query open email conversations from the queue
    return getUnansweredEmailsFromQueue(queueId);
})
.then((conversations) => {
    // mutate the information from emails to prepare for viewing
    return buildEmailInformation(conversations);
})
.then((emails) => {
    // Show the emails info on the document
    view.hideLoader();
    emails.forEach((email) => view.addEmailBox(email));
})
.catch((err) => {
    console.log(err);
});

function getUnansweredEmailsFromQueue(queueId){
    let intervalTo = moment().utc().add(1, 'h');
    let intervalFrom = intervalTo.clone().subtract(7, 'days');
    let intervalString = intervalFrom.format() + '/' + intervalTo.format();
    
    let queryBody = {
        "interval": intervalString,
        "order": "asc",
        "orderBy": "conversationStart",
        "paging": {
            "pageSize": "100",
            "pageNumber": 1
        },
        "segmentFilters": [
            {
            "type": "and",
            "predicates": [
            {
            "type": "dimension",
            "dimension": "mediaType",
            "operator": "matches",
            "value": "email"
            },
            {
            "type": "dimension",
            "dimension": "queueId",
            "operator": "matches",
            "value": queueId
            }
            ]
            }
        ],
        "conversationFilters": [
            {
            "type": "or",
            "predicates": [
            {
            "type": "dimension",
            "dimension": "conversationEnd",
            "operator": "notExists",
            "value": null
            }
            ]
            }
        ]
    }

    return analyticsApi.postAnalyticsConversationsDetailsQuery(queryBody);
}

function buildEmailInformation(conversationsData){
    let emails = [];

    for(let conversation of conversationsData.conversations){
        emails.push(new Promise((resolve, reject) => {
            // Default Values
            let senderName = '<No Name>';
            let senderEmail = '<No Email>';
            let emailSubject = '<No Subject>';
            let emailBody = '<No Body>';

            // Get duration from conversation start
            let durationMinutes = moment.duration(
                moment().utc().diff(moment(conversation.conversationStart))).as('minutes');
            let daysAgo = Math.floor(durationMinutes / (60 * 24));
            let hoursAgo = Math.floor((durationMinutes / 60) % 24);
            let minutesAgo = Math.floor(durationMinutes % 60);
            let emailDuration = '';
            if(daysAgo >= 1) emailDuration += daysAgo + 'day(s) ';
            if(hoursAgo >= 1) emailDuration += hoursAgo + 'hour(s) ';
            emailDuration += minutesAgo + 'minute(s)';

            // Get message information for Email Subject and Body
            conversationsApi.getConversationsEmailMessages(conversation.conversationId)
            .then((messages) => {
                // Get the latest email message
                let lastEntryIndex = messages.entities.length - 1;
                let messageId = messages.entities[lastEntryIndex].id;

                // Assign Subject String
                emailSubject = messages.entities[lastEntryIndex].subject ? 
                                messages.entities[lastEntryIndex].subject : emailSubject;

                return conversationsApi.getConversationsEmailMessage(conversation.conversationId, messageId)
            })
            .then((message) => {
                // Assigne email values based from latest message
                senderName = message.from.name ? message.from.name : senderName;
                senderEmail = message.from.email ? message.from.email : senderEmail;
                emailBody = message.textBody ? message.textBody : emailBody;
            })
            .then((data) => {
                resolve({
                    "senderName": senderName,
                    "senderEmail": senderEmail,
                    "emailDuration": emailDuration,
                    "emailSubject": emailSubject,
                    "emailBody": emailBody
                })
            })
            .catch((err) => {
                console.log('Oh Shit');
                console.error(err);
                reject(err);
            });
        }));        
    }

    return Promise.all(emails);
}

function assignEmailToAgent(conversationId, userId){
    
}