/**
 * The background script which is always runnin'.
 *
 * Serves as the router and controller for the extension; the popup sends messages to the background
 * and the background sets up the event recording and code generation and serves the resulting code
 * back to the popup for display to the user.
 */

import generateCode from '../helpers/codeGenerator';
import {
  RecAction,
  RecordedSession,
  ParsedEvent,
  BlockData,
} from '../types';

const session: RecordedSession = {
  events: [],
  sender: null,
};

let port: chrome.runtime.Port | null = null;

/**
 * Handles events sent from the event recorder.
 *
 * @param {ParsedEvent} event
 */
function handleEvents(event: ParsedEvent): void {
  console.log('handleEvents');
  session.events.push(event);
}

/**
 * Handles any new connections from event recorders.
 *
 * Event recorders will open new connections upon injection into their tab;
 * upon establishing this connection, we need to listen to any new messages on this port;
 * this is how the event recorder sends the background information.
 *
 * @param {chrome.runtime.Port} portToEventRecorder
 */
function handleNewConnection(portToEventRecorder: chrome.runtime.Port): void {
  console.log('handleNewConnection');
  port = portToEventRecorder;
  port.onMessage.addListener(handleEvents);
  console.log(port.sender);
  if (!session.sender) session.sender = port.sender;
}

/**
 * Injects the event recorder into the active tab.
 */
function injectEventRecorder(): void {
  console.log('injectEventRecorder');
  chrome.tabs.executeScript({ file: '/content-scripts/eventRecorder.js' });
}

/**
 * Disconnects the event recorder.
 */
function ejectEventRecorder(): void {
  console.log('ejectEventRecorder');
  if (port) port.disconnect();
}

/**
 * Starts the recording process by injecting the event recorder into the active tab.
 */
function startRecording(): void {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const activeTab = tabs[0];
    const regex = /^chrome:\/\//i;
    if (activeTab.url.match(regex)) {
      console.log('this is not a valid url', activeTab.url);
    }
 });
  chrome.webNavigation.onBeforeNavigate.addListener(ejectEventRecorder);
  chrome.webNavigation.onCompleted.addListener(injectEventRecorder);
  injectEventRecorder();
}

/**
 * Stops recording and sends back code to the view.
 *
 * @param {Function} sendResponse
 */
function stopRecording(sendResponse: (response: BlockData) => void): void {
  console.log('stopRecording');
  chrome.webNavigation.onBeforeNavigate.removeListener(ejectEventRecorder);
  chrome.webNavigation.onCompleted.removeListener(injectEventRecorder);
  ejectEventRecorder();
  const code = generateCode(session);
  sendResponse(code);
  chrome.storage.local.set({ codeBlocks: code }, () => {
    session.events = [];
    session.sender = null;
  });
}

/**
 * Performs necessary cleanup on startup and suspend.
 */
function cleanUp(): void {
  console.log('cleanUp');
  ejectEventRecorder();
  chrome.storage.local.set({ status: 'off', codeBlocks: [] });
}

/**
 * Handles control messages sent from the view (popup) and conducting the appropriate actions.
 *
 * @param {RecAction} action
 * @param {chrome.runtime.MessageSender} sender
 * @param {Function} sendResponse
 */
function handleControlAction(
  action: RecAction,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: BlockData) => void,
): void {
  console.log('handleControlAction', action.type);
  switch (action.type) {
    case 'startRec':
      startRecording();
      chrome.storage.local.set({ status: 'on' });
      break;
    case 'stopRec':
      stopRecording(sendResponse);
      chrome.storage.local.set({ status: 'off' });
      break;
    case 'resetRec':
      cleanUp();
      break;
    default:
      throw new Error('Invalid action type');
  }
}


function start() {
  console.log('startup');
  cleanUp();
}

function suspend() {
  console.log('suspend');
  cleanUp();
}

/**
 * Initializes the extension.
 */
function initialize(): void {
  console.log('initialize');
  cleanUp();
  chrome.runtime.onMessage.addListener(handleControlAction);
  chrome.runtime.onConnect.addListener(handleNewConnection);
  chrome.runtime.onStartup.addListener(start);
  chrome.runtime.onSuspend.addListener(suspend);
}

initialize();
