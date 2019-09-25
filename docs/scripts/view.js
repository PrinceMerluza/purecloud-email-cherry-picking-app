const emailContainer = document.getElementById('email-container');
const loader = document.getElementById('loader-icon');

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
            <a class="button is-dark">Assign To Me</a>
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
        emailContainer.appendChild(emailView);

        // Get references to dynamic elements
        let senderName = emailViewElement.getElementsByClassName('sender-name')[0];
        let senderEmail = emailViewElement.getElementsByClassName('sender-email')[0];
        let emailDuration = emailViewElement.getElementsByClassName('email-duration')[0];
        let emailSubject = emailViewElement.getElementsByClassName('email-subject')[0];
        let emailBody = emailViewElement.getElementsByClassName('email-body')[0];
        
        // Assign values
        senderName.textContent = emailData.senderName ? emailData.senderName : null;
        senderEmail.textContent = emailData.senderEmail ? emailData.senderEmail : null;
        emailDuration.textContent = emailData.emailDuration ? emailData.emailDuration : null;
        emailSubject.textContent = emailData.emailSubject ? emailData.emailSubject : null;
        emailBody.textContent = emailData.emailBody ? emailData.emailBody : null;
    },

    showLoader(){
        loader.style.display = 'block';
    },

    hideLoader(){
        loader.style.display = 'none';
    }
}