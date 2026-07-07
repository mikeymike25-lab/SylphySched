const admin = require('firebase-admin');

// 1. Initialize Firebase Admin SDK
// Reads service account from environment variable FIREBASE_SERVICE_ACCOUNT (JSON string)
// or falls back to a local credential file 'firebase-service-account.json'
let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:', e);
  }
} else {
  try {
    serviceAccount = require('./firebase-service-account.json');
  } catch (e) {
    console.log('No local firebase-service-account.json found. Ensure FIREBASE_SERVICE_ACCOUNT env variable is set.');
  }
}

if (!serviceAccount) {
  console.error('CRITICAL: Firebase service account credentials not configured. Exiting.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper to convert "HH:MM" to minutes from midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Main execution function
const runPushDispatcher = async () => {
  try {
    // Get current date/time in Philippine Standard Time (PST - UTC+8) or system time
    // We can extract current day of week and current minutes
    const now = new Date();
    // Convert to UTC+8 (Philippine local time) to ensure server timezone differences don't break timing
    const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[pstDate.getDay()];
    const currentMinutes = pstDate.getHours() * 60 + pstDate.getMinutes();

    console.log(`[Push Dispatcher] Current Day: ${currentDay}, Local Time: ${pstDate.toTimeString().split(' ')[0]} (${currentMinutes}m)`);

    // Fetch all user accounts
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;
      
      // Load user app data (schedule)
      const appDataDoc = await db.collection('users').doc(uid).collection('data').doc('app').get();
      if (!appDataDoc.exists) continue;
      
      const appData = appDataDoc.data();
      const schedule = appData.schedule || {};
      const todayClasses = schedule[currentDay] || [];
      
      // Check if any class starts in the next 5 minutes (i.e. starts at currentMinutes + 1 to currentMinutes + 5)
      const upcomingClasses = todayClasses.filter((item) => {
        const startMin = timeToMinutes(item.start_time);
        const diff = startMin - currentMinutes;
        return diff > 0 && diff <= 5; // Starts in 1-5 minutes
      });

      if (upcomingClasses.length === 0) continue;

      // Load user device push tokens
      const tokensSnapshot = await db.collection('users').doc(uid).collection('tokens').get();
      const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);
      
      if (tokens.length === 0) {
        console.log(`[Push Dispatcher] Upcoming class found for user ${uid}, but no active push tokens registered.`);
        continue;
      }

      // Dispatch notifications to all registered tokens for this user
      for (const item of upcomingClasses) {
        const payload = {
          notification: {
            title: 'Class Starting Soon!',
            body: `"${item.subject_name}" starts at ${item.start_time} in ${item.room || 'TBA'}`,
          },
          data: {
            tag: `class-start-${item.id}`,
            click_action: '/'
          }
        };

        console.log(`[Push Dispatcher] Sending push alert to ${tokens.length} devices for user ${uid}: "${item.subject_name}"`);
        
        // Use sendEachForMulticast to dispatch to all devices
        const response = await admin.messaging().sendEachForMulticast({
          tokens: tokens,
          notification: payload.notification,
          data: payload.data,
        });

        // Clean up expired/invalid tokens from Firestore to keep database clean
        if (response.failureCount > 0) {
          response.responses.forEach(async (resp, idx) => {
            if (!resp.success) {
              const errorCode = resp.error.code;
              // Token has expired or is no longer valid
              if (errorCode === 'messaging/invalid-registration-token' || errorCode === 'messaging/registration-token-not-registered') {
                const invalidToken = tokens[idx];
                console.log(`[Push Dispatcher] Removing invalid token for user ${uid}: ${invalidToken.substring(0, 10)}...`);
                await db.collection('users').doc(uid).collection('tokens').doc(invalidToken).delete();
              }
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('[Push Dispatcher] Critical error occurred:', error);
  }
};

runPushDispatcher().then(() => {
  console.log('[Push Dispatcher] execution finished.');
  process.exit(0);
});
