// conducts all the action
// const testBackground: String = 'testin'
// console.log(testBackground);
import action from '../actions/ui-actions';
import { DH_CHECK_P_NOT_PRIME } from 'constants';
console.log('hey there');

class RecordingController {
  recording: Array<Object>;
  badgeStatus: String;
  bindedMessageHandler: Function;
  constructor () {
    this.recording = [];
    this.badgeStatus = '';
    this.bindedMessageHandler = null;
  }

  boot () {
    chrome.extension.onConnect.addListener(listener => {
      console.log(listener);
      listener.onMessage.addListener(msg => {
        if (msg.action && msg.action === action.START) this.start();
        if (msg.action && msg.action === action.STOP) this.stop();
        if (msg.action && msg.action === action.CLEANUP) this.cleanup();
        if (msg.action && msg.action === action.PAUSE) this.pause();
        if (msg.action && msg.action === action.UNPAUSE) this.unpause();
      })
    }
  }

  start () {
    console.log('recording started');
    this.cleanup(() => {
      this.badgeStatus = 'rec';
      this.bindedMessageHandler = this.handleMessage.bind(this);


      chrome.runtime.onMessage.addListener(this.bindedMessageHandler);
    });
  }

  stop () {
    console.log('stopped recording');
    this.badgeStatus = this.recording.length > 0 ? '1' : '';
    chrome.runtime.onMessage.removeListener(this.bindedMessageHandler);
    
    
    chrome.storage.local.set({recording: this.recording}, () => {
      console.log('recording stored');
    });
  }

  cleanup (cb) {
    console.log('cleaning up');
    this.recording = [];
    chrome.storage.local.remove('recording', () => {
      console.log('cleared the recording array');
    });
    if (cb) cb();
  }

  handleMessage () {

  }
}
console.log('booting up the recording controller');
window.recordingController = new RecordingController();
window.recordingController.boot();