/* eslint-disable no-undef */
import view from './view.js';

const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;

// OAuth 
const redirectUri = window.location.href;
const clientId = 'e7de8a75-62bb-43eb-9063-38509f8c21af';

const queueId = '9f7ae000-70ce-4afd-9bbd-746f5a4d7163';

// API instances
const analyticsApi = new platformClient.AnalyticsApi();
const conversationsApi = new platformClient.ConversationsApi();
const usersApi = new platformClient.UsersApi();
const notificationsApi = new platformClient.NotificationsApi();

// User Values
let userId = null;

/**
 * Get unanswered emails from queue
 * @param {String} queueId PureCloud Queue ID
 * @returns {Promise} the api response
 */
function getUnansweredEmailsFromQueue(queueId){
    let intervalTo = moment().utc().add(1, 'h');
    let intervalFrom = intervalTo.clone().subtract(7, 'days');
    let intervalString = intervalFrom.format() + '/' + intervalTo.format();
    
    let queryBody = {
        'interval': intervalString,
        'order': 'asc',
        'orderBy': 'conversationStart',
        'paging': {
            'pageSize': '100',
            'pageNumber': 1
        },
        'segmentFilters': [
            {
                'type': 'and',
                'predicates': [
                    {
                        'type': 'dimension',
                        'dimension': 'mediaType',
                        'operator': 'matches',
                        'value': 'email'
                    },
                    {
                        'type': 'dimension',
                        'dimension': 'queueId',
                        'operator': 'matches',
                        'value': queueId
                    }
                ]
            }
        ],
        'conversationFilters': [
            {
                'type': 'or',
                'predicates': [
                    {
                        'type': 'dimension',
                        'dimension': 'conversationEnd',
                        'operator': 'notExists',
                        'value': null
                    }
                ]
            }
        ]
    };

    return analyticsApi.postAnalyticsConversationsDetailsQuery(queryBody);
}

/**
 * Builds custom Email objects containing the information from the
 * conversations.
 * @param {Object} conversationsData analytics query results
 * @returns {Promise} array of the custom email objects
 */
function buildEmailInformation(conversationsData){
    let emails = [];
    console.log(conversationsData);
    if(!conversationsData.conversations) return [];

    for(let conversation of conversationsData.conversations){
        // If not acd skip, because it might be received by an agent
        if (conversation.participants[conversation.participants.length - 1]
            .purpose != 'acd') continue;

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

                return conversationsApi
                    .getConversationsEmailMessage(conversation.conversationId, messageId);
            })
            .then((message) => {
                // Assigne email values based from latest message
                senderName = message.from.name ? message.from.name : senderName;
                senderEmail = message.from.email ? message.from.email : senderEmail;
                emailBody = message.textBody ? message.textBody : emailBody;
            })
            .then(() => {
                resolve({
                    'senderName': senderName,
                    'senderEmail': senderEmail,
                    'emailDuration': emailDuration,
                    'emailSubject': emailSubject,
                    'emailBody': emailBody,
                    'conversationId': conversation.conversationId,
                    'acdParticipant': 
                        conversation.participants[conversation.participants.length - 1]
                        .participantId
                });
            })
            .catch((err) => {
                console.log('Something went wrong');
                console.error(err);
                reject(err);
            });
        }));        
    }

    return Promise.all(emails);
}

/**
 * Assign the Email conversation to the current agent  
 * @param {String} conversationId PureCloud conversationId
 * @param {String} acdParticipantId ParticipantId of the acd participant
 */
function assignEmailToAgent(conversationId, acdParticipantId){
    view.showLoader('Assigning Email...');

    let body = {
        'userId': userId,
    };
    conversationsApi.postConversationParticipantReplace(conversationId, acdParticipantId, body)
    .then(() => {

        view.hideEmailBox(conversationId);
        view.hideLoader();
    })
    .catch((err) => {
        console.log(err);
    });
}

/**
 * Check Queue for new emails
 */
function refreshEmails(){
    view.showLoader('Gathering Emails...');
    view.hideBlankEmails();

    return getUnansweredEmailsFromQueue(queueId)
    .then((conversations) => {
        // mutate the information from emails to prepare for viewing
        return buildEmailInformation(conversations);
    })
    .then((emails) => {
        // Show the emails info on the document
        view.clearEmailContainer();
        view.hideLoader();

        if(emails.length <= 0){
            view.showBlankEmails();
        }else{
            emails.forEach((email) => view.addEmailBox(email));
        }
    })
    .catch((err) => {
        console.log(err);
    });
}

/**
 * Set-up a Notifications listener for new Email Conversations
 * entering the queue
 */
function setQueueListener(){
    let channel = {};
    let topicId = `v2.routing.queues.${queueId}.conversations.emails`;

    notificationsApi.postNotificationsChannels()
    .then((data) => {
        channel = data;

        return notificationsApi.putNotificationsChannelSubscriptions(
            channel.id, [{'id': topicId}]);
    })
    .then(() => {
        console.log('Subscribed to Queue!');

        let webSocket = new WebSocket(channel.connectUri);
        webSocket.onmessage = function(event){
            let msg = JSON.parse(event.data);
            if((msg.topicName == topicId) && (msg.eventBody.participants.length == 3)){
                setTimeout(refreshEmails, 3000);
            }
        };
    })
    .catch((err) => {
        console.log('There was a failure.');
        console.error(err);
    });
}

// Initial Setup
client.loginImplicitGrant(clientId, redirectUri)
.then((data) => {
    console.log(data);

    // Get User Info
    return usersApi.getUsersMe();
})
.then((me) => {
    userId = me.id;

    // Get Available Emails    
    return refreshEmails();
})
.then(() => {
    // Set up queue listener
    return setQueueListener();
})
.catch((err) => {
    console.log(err);
});

// Global assignment
window.assignEmailToAgent = assignEmailToAgent;
window.refreshEmails = refreshEmails;