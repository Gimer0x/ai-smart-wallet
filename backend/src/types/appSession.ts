/**
 * Session fields we store after Google login and Circle initialize-user.
 */

export interface AppSession {
  googleSub?: string;
  email?: string;
  circleUserToken?: string;
}
