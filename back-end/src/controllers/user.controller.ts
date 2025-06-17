import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import prisma from "../core/prisma";
import { hashPassword, authenticate, authorize, SafeUser } from "../core/auth";
import { UpdateUserSchema, UpdateProfileSchema } from "../schemas/user";
import { UpdateCompanySchema } from "../schemas/company";
import { InviteUserSchema } from "../schemas/auth";
import { generateRandomToken } from "../core/auth";
import { UserRole } from "@prisma/client";

const userController = new Hono();

// All routes in this controller require authentication
userController.use("*", authenticate);

// Get all users (admin only)
userController.get("/", authorize([UserRole.ADMIN]), async (c) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return c.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// Get users in the same company (admin or company admin)
userController.get("/company/:companyId", async (c) => {
  const companyId = c.req.param("companyId");
  const user = c.get("user") as SafeUser;

  // Check if user has access to this company
  if (user.role !== UserRole.ADMIN && user.companyId !== companyId) {
    return c.json(
      { error: "Forbidden", message: "Cannot access users for this company" },
      403
    );
  }

  try {
    const users = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return c.json({ users });
  } catch (error) {
    console.error(`Error fetching users for company ${companyId}:`, error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// Get a specific user by ID (admin or same company)
userController.get("/:id", async (c) => {
  const id = c.req.param("id");
  const currentUser = c.get("user") as SafeUser;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Only allow admins or users from the same company to access user details
    if (
      currentUser.role !== UserRole.ADMIN &&
      currentUser.id !== user.id &&
      currentUser.companyId !== user.companyId
    ) {
      return c.json(
        { error: "Forbidden", message: "Cannot access this user" },
        403
      );
    }

    return c.json({ user });
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    return c.json({ error: "Failed to fetch user" }, 500);
  }
});

// Update a user (admin only)
userController.put(
  "/:id",
  authorize([UserRole.ADMIN]),
  zValidator("json", UpdateUserSchema),
  async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");

    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return c.json({ error: "User not found" }, 404);
      }

      const user = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          companyId: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return c.json({ user });
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      return c.json({ error: "Failed to update user" }, 500);
    }
  }
);

// Update own profile (any authenticated user)
userController.put(
  "/profile/me",
  zValidator("json", UpdateProfileSchema),
  async (c) => {
    const data = c.req.valid("json");
    const user = c.get("user") as SafeUser;

    try {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          companyId: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return c.json({ user: updatedUser });
    } catch (error) {
      console.error(`Error updating profile for user ${user.id}:`, error);
      return c.json({ error: "Failed to update profile" }, 500);
    }
  }
);

// Invite a user to a company (admin or company admin)
userController.post(
  "/invite",
  zValidator("json", InviteUserSchema),
  async (c) => {
    const { email, role, companyId } = c.req.valid("json");
    const currentUser = c.get("user") as SafeUser;

    // Check if user has access to this company
    if (
      currentUser.role !== UserRole.ADMIN &&
      currentUser.companyId !== companyId
    ) {
      return c.json(
        { error: "Forbidden", message: "Cannot invite users to this company" },
        403
      );
    }

    try {
      // Check if company exists
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return c.json({ error: "Company not found" }, 404);
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      // Check if there's already a pending invitation
      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          email,
          companyId,
          status: "PENDING",
        },
      });

      if (existingInvitation) {
        return c.json(
          { error: "There is already a pending invitation for this email" },
          400
        );
      }

      // Generate invitation token and set expiration (7 days)
      const token = generateRandomToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invitation
      const invitation = await prisma.invitation.create({
        data: {
          email,
          token,
          companyId,
          invitedById: currentUser.id,
          role,
          expiresAt,
          invitedUserId: existingUser?.id,
        },
        include: {
          company: {
            select: {
              name: true,
            },
          },
          invitedBy: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // In a real application, you would send an email with the invitation link
      // For this example, we'll just return the token

      return c.json(
        {
          message: `Invitation sent to ${email}`,
          invitation: {
            id: invitation.id,
            email: invitation.email,
            companyName: invitation.company.name,
            invitedBy: invitation.invitedBy.email,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
            // Only return token in development for testing
            ...(process.env.NODE_ENV === "development"
              ? { token: invitation.token }
              : {}),
          },
        },
        201
      );
    } catch (error) {
      console.error("Error inviting user:", error);
      return c.json({ error: "Failed to invite user" }, 500);
    }
  }
);

// Get pending invitations for a company (admin or company admin)
userController.get("/invitations/company/:companyId", async (c) => {
  const companyId = c.req.param("companyId");
  const user = c.get("user") as SafeUser;

  // Check if user has access to this company
  if (user.role !== UserRole.ADMIN && user.companyId !== companyId) {
    return c.json(
      {
        error: "Forbidden",
        message: "Cannot access invitations for this company",
      },
      403
    );
  }

  try {
    const invitations = await prisma.invitation.findMany({
      where: {
        companyId,
        status: "PENDING",
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return c.json({ invitations });
  } catch (error) {
    console.error(
      `Error fetching invitations for company ${companyId}:`,
      error
    );
    return c.json({ error: "Failed to fetch invitations" }, 500);
  }
});

// Get current user's profile
userController.get("/profile/me", async (c) => {
  const user = c.get("user") as SafeUser;

  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            logoUrl: true,
            planType: true,
            storageMode: true,
            retentionDays: true,
            encryptData: true,
            autoDelete: true,
            consentGiven: true,
            consentDate: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                users: true,
                servers: true,
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    console.error(`Error fetching profile for user ${user.id}:`, error);
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

// Update company information (company admin only)
userController.put(
  "/profile/company",
  zValidator("json", UpdateCompanySchema),
  async (c) => {
    const data = c.req.valid("json");
    const user = c.get("user") as SafeUser;

    if (!user.companyId) {
      return c.json({ error: "You are not associated with any company" }, 404);
    }

    // Only admin users can update company info
    if (user.role !== UserRole.ADMIN) {
      return c.json(
        { error: "Only admin users can update company information" },
        403
      );
    }

    try {
      const updatedCompany = await prisma.company.update({
        where: { id: user.companyId },
        data,
        select: {
          id: true,
          name: true,
          contactEmail: true,
          logoUrl: true,
          planType: true,
          storageMode: true,
          retentionDays: true,
          encryptData: true,
          autoDelete: true,
          consentGiven: true,
          consentDate: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              servers: true,
            },
          },
        },
      });

      return c.json({ company: updatedCompany });
    } catch (error) {
      console.error(`Error updating company ${user.companyId}:`, error);
      return c.json({ error: "Failed to update company information" }, 500);
    }
  }
);

// Get company users (admin only)
userController.get("/profile/company/users", async (c) => {
  const user = c.get("user") as SafeUser;

  if (!user.companyId) {
    return c.json({ error: "You are not associated with any company" }, 404);
  }

  // Only admin users can view company users
  if (user.role !== UserRole.ADMIN) {
    return c.json({ error: "Only admin users can view company users" }, 403);
  }

  try {
    const users = await prisma.user.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ users });
  } catch (error) {
    console.error(
      `Error fetching company users for company ${user.companyId}:`,
      error
    );
    return c.json({ error: "Failed to fetch company users" }, 500);
  }
});

export default userController;
