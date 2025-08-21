import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";

const router = Router();

// OIDC/SAML SSO endpoints are handled by replitAuth.ts
// This file provides additional auth utilities and user management

// Get current authenticated user (with fallback for development)
router.get('/api/auth/user', async (req: any, res) => {
  try {
    // Check if user is authenticated via session
    if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims) {
      const userId = req.user.claims.sub;
      const user = {
        id: userId,
        email: req.user.claims.email,
        firstName: req.user.claims.first_name,
        lastName: req.user.claims.last_name,
        profileImageUrl: req.user.claims.profile_image_url,
        scopes: ["payroll:read", "payroll:write", "employees:read", "employees:write", "filings:write"]
      };
      
      return res.json(user);
    }
    
    // For development/testing - return 401 as expected by the frontend
    res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// SCIM user provisioning endpoint
const SCIMUserSchema = z.object({
  userName: z.string(),
  name: z.object({
    givenName: z.string(),
    familyName: z.string()
  }),
  emails: z.array(z.object({
    value: z.string().email(),
    primary: z.boolean().optional()
  })),
  active: z.boolean().default(true)
});

router.post('/api/scim/v2/Users', isAuthenticated, async (req, res) => {
  try {
    const userData = SCIMUserSchema.parse(req.body);
    
    // In production, this would create/provision user in your user management system
    const provisionedUser = {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      id: `user-${Date.now()}`,
      userName: userData.userName,
      name: userData.name,
      emails: userData.emails,
      active: userData.active,
      meta: {
        resourceType: "User",
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    };
    
    res.status(201).json(provisionedUser);
  } catch (error) {
    console.error("Error provisioning user:", error);
    res.status(400).json({ 
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "Invalid user data",
      status: "400"
    });
  }
});

// Get SCIM user
router.get('/api/scim/v2/Users/:id', isAuthenticated, async (req, res) => {
  try {
    // In production, fetch from user management system
    const user = {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      id: req.params.id,
      userName: `user-${req.params.id}`,
      active: true,
      meta: {
        resourceType: "User",
        created: "2025-01-01T00:00:00Z",
        lastModified: new Date().toISOString()
      }
    };
    
    res.json(user);
  } catch (error) {
    res.status(404).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User not found",
      status: "404"
    });
  }
});

export default router;