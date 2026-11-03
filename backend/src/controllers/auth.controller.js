/**
 * Authentication Controller
 * Handles Google OAuth 2.0 authentication flow
 */

import { createOAuth2Client, getAuthUrl, getUserInfo } from '../config/google.js';
import { generateToken } from '../utils/jwt.js';
import logger from '../utils/logger.js';

/**
 * Helper to determine current request origin (protocol + host)
 */
const getRequestOrigin = (req) => {
  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const host = req.headers.host || 'localhost:3001';
  return `${protocol}://${host}`;
};

/**
 * Initiate Google OAuth authentication
 */
export const initiateGoogleAuth = async (req, res) => {
  const origin = getRequestOrigin(req);
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const isConfigured = clientId.length > 20 && !clientId.includes('your_google_client_id');
  
  const clientFrontendUrl = req.headers.referer ? new URL(req.headers.referer).origin : (req.headers.origin || 'http://localhost:3000');
  const oauth2Client = createOAuth2Client(redirectUri);
  const authUrl = getAuthUrl(oauth2Client, { state: clientFrontendUrl });

  logger.info(`Initiating Google OAuth flow with redirect URI: ${redirectUri}, state: ${clientFrontendUrl}`);

  res.json({
    success: true,
    isConfigured,
    authUrl,
    message: 'Redirect user to this URL for authentication',
  });
};

/**
 * Handle Google OAuth callback
 */
export const handleGoogleCallback = async (req, res) => {
  const { code, state } = req.query;
  const origin = getRequestOrigin(req);
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
  
  // Use state or referer to redirect back to local or production frontend
  let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  if (state && (state.startsWith('http://') || state.startsWith('https://'))) {
    frontendUrl = state;
  } else if (req.headers.host && req.headers.host.includes('localhost')) {
    frontendUrl = 'http://localhost:3000';
  }

  if (!code) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Authorization code is required',
    });
  }

  try {
    const oauth2Client = createOAuth2Client(redirectUri);
    
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user information
    const userInfo = await getUserInfo(oauth2Client);

    // Store tokens and user info in session (for backup/compatibility)
    if (req.session) {
      req.session.tokens = tokens;
      req.session.userId = userInfo.id;
      req.session.userEmail = userInfo.email;
      req.session.userName = userInfo.name;
      
      await new Promise((resolve) => {
        req.session.save((err) => {
          if (err) logger.warn('Session save failed:', err.message);
          resolve();
        });
      });
    }

    logger.info(`User authenticated: ${userInfo.email}`);

    // Generate JWT with Google tokens included for stateless auth
    const jwtToken = generateToken({
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      tokens: tokens, // Include Google tokens in JWT for stateless operation
    });
    
    const sessionId = req.sessionID || 'jwt-session';

    // Redirect to frontend with success
    res.redirect(`${frontendUrl}/?auth=success&token=${jwtToken}&sid=${sessionId}`);
  } catch (error) {
    logger.error('OAuth callback error:', error);
    res.redirect(`${frontendUrl}/?auth=failed&error=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (req, res) => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(req.session.tokens);

    const userInfo = await getUserInfo(oauth2Client);

    res.json({
      success: true,
      user: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        verified: userInfo.verified_email,
      },
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user information',
    });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req, res) => {
  try {
    const { tokens } = req.session;

    if (!tokens || !tokens.refresh_token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No refresh token available',
      });
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update session
    req.session.tokens = credentials;

    logger.info(`Token refreshed for user: ${req.session.userEmail}`);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      expiresAt: credentials.expiry_date,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token Refresh Failed',
      message: 'Failed to refresh access token',
    });
  }
};

/**
 * Logout user
 */
export const logout = async (req, res) => {
  const userEmail = req.session.userEmail;

  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout error:', err);
      return res.status(500).json({
        error: 'Logout Failed',
        message: 'Failed to destroy session',
      });
    }

    res.clearCookie('voice-email.sid');
    logger.info(`User logged out: ${userEmail}`);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });
};

export default {
  initiateGoogleAuth,
  handleGoogleCallback,
  getCurrentUser,
  refreshToken,
  logout,
};
