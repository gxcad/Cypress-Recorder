// event recorder
export default class EventRecorder {
  constructor() {
    this.eventLog = []
  }

  recordEvent(e) {
    const msg: Object = {
      action: e.type,
      value: e.target.value,
      keycode: e.keycode ? e.keycode : null,
    };
    this.sendMessage(msg);
  }

  sendMessage(msg: Object) {
    try {
      if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.sendMessage(msg);
      } else {
        this.eventLog.push(msg);
      }
    }
    catch (error) {
      console.debug(error);
    }
  }
  
}