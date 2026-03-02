import { Hono } from "hono";

import { generateToken } from "@/core/auth";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { ssoService } from "@/services/auth/sso.service";
import { notionService } from "@/services/integrations/notion.service";
import { setSentryUser } from "@/services/sentry";

import { config, emailConfig, ssoConfig } from "@/config";

import { UserMapper } from "@/mappers/auth";

const app = new Hono();

// User select fields (mirrors google.ts pattern)
const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  workspaceId: true,
  isActive: true,
  emailVerified: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
  ssoSubjectId: true,
  pendingEmail: true,
  subscription: {
    select: {
      plan: true,
      status: true,
    },
  },
  workspace: {
    select: {
      id: true,
    },
  },
} as const;

/**
 * GET /sso/authorize
 * Initiates the SSO flow by redirecting to the Identity Provider
 * Generates a cryptographically random state token for CSRF protection
 */
app.get("/authorize", async (c) => {
  if (!ssoConfig.enabled) {
    return c.json({ error: "SSO is not enabled" }, 503);
  }

  try {
    const apiUrl = config.API_URL;
    const redirectUrl = `${apiUrl}/sso/callback`;

    // Generate cryptographically random state token for CSRF protection
    const state = await ssoService.generateStateToken();

    const result = await ssoService.oauthController.authorize({
      client_id: "dummy",
      tenant: ssoConfig.tenant,
      product: ssoConfig.product,
      state,
      redirect_uri: redirectUrl,
      response_type: "code",
      code_challenge: "",
      code_challenge_method: "",
    });

    if ("redirect_url" in result && result.redirect_url) {
      return c.redirect(result.redirect_url);
    }

    return c.json({ error: "Failed to generate authorization URL" }, 500);
  } catch (error) {
    logger.error({ error }, "SSO authorize error");
    return c.json({ error: "SSO authorization failed" }, 500);
  }
});

/**
 * POST /sso/acs
 * SAML Assertion Consumer Service endpoint
 * Receives SAMLResponse from the Identity Provider
 */
app.post("/acs", async (c) => {
  if (!ssoConfig.enabled) {
    return c.json({ error: "SSO is not enabled" }, 503);
  }

  try {
    const body = await c.req.parseBody();
    const { SAMLResponse, RelayState } = body;

    const result = await ssoService.oauthController.samlResponse({
      SAMLResponse: SAMLResponse as string,
      RelayState: RelayState as string,
    });

    if ("redirect_url" in result && result.redirect_url) {
      return c.redirect(result.redirect_url);
    }

    return c.json({ error: "SAML response processing failed" }, 500);
  } catch (error) {
    logger.error({ error }, "SSO SAML ACS error");
    return c.json({ error: "SAML assertion processing failed" }, 500);
  }
});

/**
 * GET /sso/callback
 * Handles the callback from Jackson after IdP authentication
 * Validates the OAuth state parameter (CSRF protection)
 * Exchanges the code for user info, finds/creates user, issues JWT
 */
app.get("/callback", async (c) => {
  if (!ssoConfig.enabled) {
    return c.json({ error: "SSO is not enabled" }, 503);
  }

  const code = c.req.query("code");
  const state = c.req.query("state");
  const frontendUrl = emailConfig.frontendUrl;
  const apiUrl = config.API_URL;

  if (!code) {
    return c.redirect(`${frontendUrl}/auth/sso/callback?error=missing_code`);
  }

  // CSRF Protection: Validate the OAuth state parameter
  if (!state) {
    logger.warn("SSO callback received without state parameter");
    return c.redirect(`${frontendUrl}/auth/sso/callback?error=invalid_state`);
  }

  const isValidState = await ssoService.validateStateToken(state);
  if (!isValidState) {
    logger.warn(
      { state },
      "SSO callback received with invalid or expired state token"
    );
    return c.redirect(`${frontendUrl}/auth/sso/callback?error=invalid_state`);
  }

  try {
    // Exchange the code for an access token via Jackson
    const tokenRes = await ssoService.oauthController.token({
      code,
      grant_type: "authorization_code",
      client_id: `tenant=${ssoConfig.tenant}&product=${ssoConfig.product}`,
      client_secret: "dummy",
      redirect_uri: `${apiUrl}/sso/callback`,
    });

    if ("access_token" in tokenRes && tokenRes.access_token) {
      // Get user profile from Jackson
      const profile = await ssoService.oauthController.userInfo(
        tokenRes.access_token
      );

      if (!profile.email) {
        return c.redirect(`${frontendUrl}/auth/sso/callback?error=no_email`);
      }

      if (!profile.id) {
        logger.error(
          { profile },
          "SSO IdP returned no subject identifier (profile.id)"
        );
        return c.redirect(
          `${frontendUrl}/auth/sso/callback?error=no_subject_id`
        );
      }

      // Find user by SSO subject ID first (most secure)
      let user = await prisma.user.findUnique({
        where: { ssoSubjectId: profile.id },
        select: userSelect,
      });

      let isNewUser = false;

      if (user) {
        // User already linked to this SSO identity - just update last login
        user = await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
          select: userSelect,
        });
      } else {
        // Check if email is already in use by another account
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email },
          select: { id: true, ssoSubjectId: true, googleId: true },
        });

        if (existingUser) {
          // Security: Account exists with this email but different auth method
          // Do NOT automatically link - this would enable account takeover
          logger.warn(
            {
              email: profile.email,
              ssoSubjectId: profile.id,
              existingAuthMethods: {
                hasSSO: !!existingUser.ssoSubjectId,
                hasGoogle: !!existingUser.googleId,
              },
            },
            "SSO login attempted for email with existing account"
          );
          return c.redirect(
            `${frontendUrl}/auth/sso/callback?error=email_in_use`
          );
        }

        // No existing account - create new user
        isNewUser = true;
        try {
          user = await prisma.user.create({
            data: {
              email: profile.email,
              firstName: profile.firstName || "",
              lastName: profile.lastName || "",
              ssoSubjectId: profile.id,
              emailVerified: true,
              emailVerifiedAt: new Date(),
              isActive: true,
              lastLogin: new Date(),
            },
            select: userSelect,
          });

          // Notion sync (fire and forget)
          prisma.user
            .findUnique({ where: { id: user.id } })
            .then((fullUser) => {
              if (fullUser) {
                return notionService.syncUser(fullUser);
              }
            })
            .catch((notionError) => {
              logger.warn(
                { notionError, userId: user?.id },
                "Failed to update Notion"
              );
            });
        } catch (createError) {
          logger.error({ error: createError }, "SSO user creation failed");
          return c.redirect(
            `${frontendUrl}/auth/sso/callback?error=account_creation_failed`
          );
        }
      }

      if (!user.isActive) {
        return c.redirect(
          `${frontendUrl}/auth/sso/callback?error=account_inactive`
        );
      }

      // Generate JWT
      const jwt = await generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
      });

      setSentryUser({
        id: user.id,
        email: user.email,
        workspaceId: user.workspaceId,
      });

      // Store JWT with temp auth code and redirect to frontend
      const authCode = await ssoService.storeAuthCode(
        jwt,
        UserMapper.toApiResponse(user) as Record<string, unknown>,
        isNewUser
      );

      return c.redirect(`${frontendUrl}/auth/sso/callback?code=${authCode}`);
    }

    return c.redirect(
      `${frontendUrl}/auth/sso/callback?error=token_exchange_failed`
    );
  } catch (error) {
    logger.error({ error }, "SSO callback error");
    return c.redirect(
      `${frontendUrl}/auth/sso/callback?error=authentication_failed`
    );
  }
});

export default app;
