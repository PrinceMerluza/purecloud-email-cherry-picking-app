const emailContainer = document.getElementById('email-container');
const loader = document.getElementById('loader-icon');
const loaderText = document.getElementById('loader-text');
const noEmailText = document.getElementById('no-emails');

let emailBoxTemplate = document.createElement('template');
emailBoxTemplate.innerHTML =
`<div class="box">
    <article class="media">
    <div class="media-content">
        <div class="content">
        <p>
            On Queue: <small><span class="email-duration">31m</span></small>
            <br>
            From: <strong><span class="sender-name">John Smith</span></strong> <small><span class="sender-email">email@email.com</span></small> 
            <br>
            Subject: <strong><span class="email-subject">Subject</span></strong>
            <br>
            <div class="email-body">
                Body of email
            </div>
        </p>
        </div>
        <div>
            <a class="button is-dark btn-assign" onclick="assignEmailToAgent()">Assign To Me</a>
        </div>
    </div>
    </article>
</div>`;

export default {
    /**
     * Add an email box to the document
     * @param {Object} emailData contains the email information
     */
    addEmailBox(emailData){
        // Add the email box to the DOM
        let emailView = document.importNode(emailBoxTemplate.content, true);
        let emailViewElement = emailView.firstChild;
        emailViewElement.id = emailData.conversationId;
        emailContainer.appendChild(emailView);

        // Get references to dynamic elements
        let senderName = emailViewElement.getElementsByClassName('sender-name')[0];
        let senderEmail = emailViewElement.getElementsByClassName('sender-email')[0];
        let emailDuration = emailViewElement.getElementsByClassName('email-duration')[0];
        let emailSubject = emailViewElement.getElementsByClassName('email-subject')[0];
        let emailBody = emailViewElement.getElementsByClassName('email-body')[0];
        let btnAssign = emailViewElement.getElementsByClassName('btn-assign')[0];
        
        // Assign values
        senderName.textContent = emailData.senderName ? emailData.senderName : null;
        senderEmail.textContent = emailData.senderEmail ? emailData.senderEmail : null;
        emailDuration.textContent = emailData.emailDuration ? emailData.emailDuration : null;
        emailSubject.textContent = emailData.emailSubject ? emailData.emailSubject : null;
        emailBody.textContent = emailData.emailBody ? emailData.emailBody : null;

        // Assign onlcick action to button
        btnAssign.setAttribute('onclick', 
            'assignEmailToAgent(' + 
                `"${emailData.conversationId}",` +
                `"${emailData.acdParticipant}",` +
            ')'); 
    },

    /**
     * Hide an email box when user assigns it to agent
     * @param {String} id 
     */
    hideEmailBox(id){
        document.getElementById(id).style.display = 'none';
    },

    /**
     * Shows the loader/spinner in the page
     * @param {String} text Loading Text
     */
    showLoader(text){
        loader.style.display = 'block';
        emailContainer.style.display = 'none';

        loaderText.textContent = text ? text : 'Loading...';
    },

    /**
     * Hide the loader/spinner
     */
    hideLoader(){
        loader.style.display = 'none';
        emailContainer.style.display = 'block';

    },

    /**
     * Removes all Email panels from the container
     */
    clearEmailContainer(){
        while(emailContainer.firstChild) {
            emailContainer.firstChild.remove();
        }
    },
    
    /**
     * Show message that informs that there are no available emails
     */
    showBlankEmails(){
        noEmailText.style.display = 'block';
    },

    /**
     * Hide message that informs that there are no available emails
     */
    hideBlankEmails(){
        noEmailText.style.display = 'none';
    },
};