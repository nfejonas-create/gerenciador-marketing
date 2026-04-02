declare module 'passport-linkedin-oauth2' {
  import { Strategy as PassportStrategy } from 'passport';
  export interface Profile {
    id: string;
    displayName: string;
    emails?: { value: string }[];
    photos?: { value: string }[];
  }
  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
  }
  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: (accessToken: string, refreshToken: string, profile: Profile, done: (err: any, user?: any) => void) => void);
  }
}
