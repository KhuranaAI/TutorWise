// Firebase web settings for tutorwise.ca/literacy (project tutorwise-literacy).
// These values are designed to be public. Students' work is protected by the
// Firestore security rules, which are kept outside this repository.
export const FIREBASE = {
  apiKey: "AIzaSyDkHlCMIw3okq-jY51CoqzA_xzgwRsNNHs",
  authDomain: "tutorwise-literacy.firebaseapp.com",
  projectId: "tutorwise-literacy",
  appId: "1:147620602539:web:745f6e890d286c884b0dee",
};

// Students sign in with a username, not an email. Firebase needs an email
// behind every password account, so the username is turned into a
// placeholder address on this subdomain. No mail is ever sent to it.
export const STUDENT_DOMAIN = "student.literacy.tutorwise.ca";
