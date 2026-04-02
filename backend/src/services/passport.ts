import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Strategy: LinkedInStrategy } = require('passport-linkedin-oauth2');

const prisma = new PrismaClient();

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
  }, async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
    try {
      let user = await prisma.user.findFirst({ where: { googleId: profile.id } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: profile.emails?.[0].value || '',
            name: profile.displayName,
            avatar: profile.photos?.[0].value,
            provider: 'google',
            googleId: profile.id,
          },
        });
      }
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
      done(null, { token, user });
    } catch (err) {
      done(err as Error);
    }
  }));
}

if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/auth/linkedin/callback`,
    scope: ['r_emailaddress', 'r_liteprofile'],
  }, async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
    try {
      let user = await prisma.user.findFirst({ where: { linkedinId: profile.id } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: profile.emails?.[0].value || '',
            name: profile.displayName,
            avatar: profile.photos?.[0].value,
            provider: 'linkedin',
            linkedinId: profile.id,
          },
        });
      }
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
      done(null, { token, user });
    } catch (err) {
      done(err);
    }
  }));
}
