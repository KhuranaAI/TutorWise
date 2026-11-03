/* Cloud save settings (Firebase).
   Leave these empty to keep progress on the device only (the cloud-save card is hidden).
   To turn cloud save on: create a Firebase project, create a Firestore database, paste
   firestore.rules into its Rules tab, then copy projectId and apiKey from
   Project settings → Your apps → Web app. The web apiKey is designed to be public;
   the security rules are what protect the data. */
window.BOLO_CLOUD = window.BOLO_CLOUD || {
  firebase: {
    projectId: "",  // e.g. "bolo-hindi-1a2b3"
    apiKey: ""      // e.g. "AIzaSy…"
  }
};
