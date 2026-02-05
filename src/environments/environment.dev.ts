export const environment = {
  production: false,
  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  baseUrl: 'https://dev.api.boukii.com',
  wsConfig: {
    enabled: false, // TODO: enable and configure host/port/key for dev websockets
    key: 'PUSHER_APP_KEY',
    cluster: 'mt1',
    wsHost: 'localhost',
    wsPort: 6001,
    forceTLS: false,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
  },
  firebaseConfig: {
    apiKey: "AIzaSyAVqgEm3-_sMPLqxySQpyHKEfLtQ1_7pHI",
    authDomain: "boukii-test.firebaseapp.com",
    projectId: "boukii-test",
    storageBucket: "boukii-test.appspot.com",
    messagingSenderId: "80492512236",
    appId: "1:80492512236:web:bba5002b4c9ec6c2e776c9"
  }
};
