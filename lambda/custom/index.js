const Alexa = require('ask-sdk-core');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'アイテムリストへようこそ。ここでは店舗ごとで販売している商品やイベントについて知ることができます。何を知りたいですか？';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    },
};

const ActionIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'ActionIntent'
            && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .addDelegateDirective()
            .getResponse();
    },
};

const InCompletedActionIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'ActionIntent'
            && handlerInput.requestEnvelope.request.dialogState === 'COMPLETED';
    },
    handle(handlerInput) {
        console.log("COMPLETED RecommendationIntent");

        const currentIntent = handlerInput.requestEnvelope.request.intent;
        const slotValues = getSlotValues(currentIntent.slots);
        const storeValue = slotValues.store.resolvedValues[0].value;
        const itemValue = slotValues.item.resolvedValues[0].value;
        const speechText = `${storeValue}店の${itemValue}ですね。なんと100円ですよ！ぜひ買いに来てくださいね。さようなら。`
        return handlerInput.responseBuilder
            .speak(speechText)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = '「特注品（とくばいひん）をしりたい」、「野菜について知りたい」などはなしかけることで店舗でのお値段を知ることができます。何を知りたいですか？';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    },
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'またのお越しをお待ちしております。';

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

        return handlerInput.responseBuilder.getResponse();
    },
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error: ${error.message}`);
        const speechText = 'ごめんなさい。うまく聞き取ることができませんでした。もう一度おねがいします。';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    },
};

// ------------------------ Request Interceptor ------------------------------>
const NewSessionRequestInterceptor = {
    async process(handlerInput) {
        // console.log(JSON.stringify(handlerInput.requestnvelope.request));
    }
};

// ------------------------ Response Interceptor ------------------------------>
const SessionWillEndInterceptor = {
    async process(handlerInput, responseOutput) {
        console.log('responseOutput:', JSON.stringify(responseOutput));
    }
};

// ------------------------ Util functions ------------------------------------>
function getSlotValues(slots) {
    const slotValues = {};
    for (let key in slots) {
        if (slots.hasOwnProperty(key)) {
            slotValues[key] = {
                synonym: slots[key].value || null ,
                resolvedValues: (slots[key].value ? [slots[key].value] : []),
                statusCode: null,
            };

            let statusCode = (((((slots[key] || {} )
                .resolutions || {})
                .resolutionsPerAuthority || [])[0] || {} )
                .status || {})
                .code;

            let authority = ((((slots[key] || {})
                .resolutions || {})
                .resolutionsPerAuthority || [])[0] || {})
                .authority;

            slotValues[key].authority = authority;

            // any value other than undefined then entity resolution was successful
            if (statusCode) {
                slotValues[key].statusCode = statusCode;
                // we have resolved value(s)!
                if (slots[key].resolutions.resolutionsPerAuthority[0].values) {
                    let resolvedValues = slots[key].resolutions.resolutionsPerAuthority[0].values;
                    slotValues[key].resolvedValues = [];
                    for (let i = 0; i < resolvedValues.length; i++) {
                        slotValues[key].resolvedValues.push({
                            value: resolvedValues[i].value.name,
                            id: resolvedValues[i].value.id
                        });
                    }
                }
            }
        }
    }
    return slotValues;
}

function getNewSlots(previous, current) {
    const previousSlotValues = getSlotValues(previous);
    const currentSlotValues = getSlotValues(current);

    let newlyCollectedSlots = {};
    for(let slotName in previousSlotValues) {
        // resolvedValues and statusCode are dependent on our synonym so we only
        // need to check if there's a difference of synonyms.
        if (previousSlotValues[slotName].synonym !== currentSlotValues[slotName].synonym){
            newlyCollectedSlots[slotName] = currentSlotValues[slotName];
        }
    }
    return newlyCollectedSlots;
}


let skill;
/* LAMBDA SETUP */
exports.handler = async (event, context) => {
    console.log(JSON.stringify(event, null, 2));
    if (!skill) {
        skill = Alexa.SkillBuilders.custom()
            .addRequestHandlers(
                LaunchRequestHandler,
                InCompletedActionIntentHandler,
                ActionIntentHandler,
                HelpIntentHandler,
                CancelAndStopIntentHandler,
                SessionEndedRequestHandler,
            )
            .addRequestInterceptors(
                NewSessionRequestInterceptor
            )
            .addResponseInterceptors(SessionWillEndInterceptor)
            .addErrorHandlers(ErrorHandler)
            .create();
    }
    return skill.invoke(event, context);
};