/** Gmail API constants: scopes, base URL, label IDs */

export const GMAIL_BASE_URL = 'https://gmail.googleapis.com/gmail/v1';

/** OAuth 2.0 scopes requested at sign-in */
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'email',
  'profile',
];

/** Well-known Gmail system label IDs */
export const LABEL = {
  INBOX: 'INBOX',
  SENT: 'SENT',
  UNREAD: 'UNREAD',
  STARRED: 'STARRED',
  IMPORTANT: 'IMPORTANT',
  SPAM: 'SPAM',
  TRASH: 'TRASH',
  CATEGORY_PERSONAL: 'CATEGORY_PERSONAL',
  CATEGORY_SOCIAL: 'CATEGORY_SOCIAL',
  CATEGORY_PROMOTIONS: 'CATEGORY_PROMOTIONS',
  CATEGORY_UPDATES: 'CATEGORY_UPDATES',
  CATEGORY_FORUMS: 'CATEGORY_FORUMS',
} as const;

/** Max messages to fetch per page */
export const GMAIL_PAGE_SIZE = 100;

/** Max messages per batch-get request */
export const GMAIL_BATCH_SIZE = 50;

/** Initial sync limit (most recent messages) */
export const GMAIL_INITIAL_SYNC_LIMIT = 500;

/** Android OAuth client ID */
export const ANDROID_CLIENT_ID =
  '751305008800-c192vib8ip9lhm0l9mh07ndf9sfj2nda.apps.googleusercontent.com';

/** Web client ID — required by @react-native-google-signin for token exchange */
export const WEB_CLIENT_ID =
  '751305008800-1p9h74vutj50jevig8b0c5bpnt9ifat1.apps.googleusercontent.com';
