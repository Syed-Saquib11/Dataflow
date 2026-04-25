'use strict';

const { google } = require('googleapis');
const googleService = require('./google-service');

async function publishTestAsForm(test) {
  // 1. Get valid access token
  const token = await googleService.getValidAccessToken();

  // 2. Build OAuth2 client and set credentials
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });

  const forms = google.forms({ version: 'v1', auth });

  // 3. Step 1 — Create form with title only:
  const createRes = await forms.forms.create({
    requestBody: {
      info: {
        title: test.title,
        documentTitle: test.title,
      },
    },
  });

  const formId = createRes.data.formId;

  // 4. Step 2 — batchUpdate to add all questions:
  
  const requests = [
    {
      updateSettings: {
        settings: {
          quizSettings: {
            isQuiz: true
          }
        },
        updateMask: "quizSettings.isQuiz"
      }
    },
    {
      createItem: {
        item: {
          title: "Student Roll Number / ID",
          questionItem: {
            question: {
              required: true,
              textQuestion: {}
            }
          }
        },
        location: { index: 0 }
      }
    }
  ];

  test.questions.forEach((question, index) => {
    let questionItem = {
      question: {
        required: false,
      }
    };
    
    if (question.imageUrl && question.imageUrl.trim() !== '') {
      questionItem.image = { sourceUri: question.imageUrl.trim() };
    }

    if (question.type === 'mcq') {
      questionItem.question.choiceQuestion = {
        type: 'RADIO',
        options: question.options.map(o => ({ value: o.text }))
      };
      
      const correctAnswers = (question.options || []).filter(o => o.isCorrect).map(o => o.text);
      questionItem.question.grading = {
        pointValue: question.marks || 0
      };
      if (correctAnswers.length > 0) {
        questionItem.question.grading.correctAnswers = {
          answers: correctAnswers.map(ans => ({ value: ans }))
        };
      }
    } else if (question.type === 'short') {
      questionItem.question.textQuestion = {};
      questionItem.question.grading = { pointValue: question.marks || 0 };
    } else if (question.type === 'long') {
      questionItem.question.textQuestion = { paragraph: true };
      questionItem.question.grading = { pointValue: question.marks || 0 };
    }

    requests.push({
      createItem: {
        item: {
          title: question.text,
          questionItem: questionItem
        },
        location: { index: index + 1 }
      }
    });
  });

  if (requests.length > 0) {
    await forms.forms.batchUpdate({
      formId: formId,
      requestBody: {
        requests: requests
      }
    });
  }

  // 5. Step 3 — Get the form to retrieve responderUri:
  const getRes = await forms.forms.get({ formId: formId });
  const responderUri = getRes.data.responderUri;

  // 6. Return both formId (for API access later) and responderUri (for students)
  return { formId, responderUri };
}

async function getFormResponses(formId) {
  const token = await googleService.getValidAccessToken();
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });

  const forms = google.forms({ version: 'v1', auth });

  const formRes = await forms.forms.get({ formId });
  const formStructure = formRes.data;

  const responsesRes = await forms.forms.responses.list({ formId });
  const responses = responsesRes.data.responses || [];

  return { formStructure, responses };
}

module.exports = { publishTestAsForm, getFormResponses };
