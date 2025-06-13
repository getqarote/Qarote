import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRegister } from "@/hooks/useAuth";
import { useAuth } from "@/contexts/AuthContext";

const SignUp: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const { isAuthenticated } = useAuth();
  const registerMutation = useRegister();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const validatePasswords = () => {
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !firstName || !lastName) {
      return;
    }

    if (!validatePasswords()) {
      return;
    }

    const userData = {
      email,
      password,
      firstName,
      lastName,
      ...(companyName && { companyName }),
    };

    registerMutation.mutate(userData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-purple-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-blue-100">
            Or{" "}
            <Link
              to="/auth/sign-in"
              className="font-medium text-blue-300 hover:text-blue-200 transition-colors"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-gray-900">Get started</CardTitle>
            <CardDescription>
              Create your account to access the RabbitMQ dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {registerMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {registerMutation.error instanceof Error
                      ? registerMutation.error.message
                      : "Failed to create account. Please try again."}
                  </AlertDescription>
                </Alert>
              )}

              {passwordError && (
                <Alert variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="John"
                    disabled={registerMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Doe"
                    disabled={registerMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="john@example.com"
                  disabled={registerMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company name (optional)</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company"
                  disabled={registerMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a password"
                  disabled={registerMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your password"
                  disabled={registerMutation.isPending}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  registerMutation.isPending ||
                  !email ||
                  !password ||
                  !firstName ||
                  !lastName ||
                  password !== confirmPassword
                }
              >
                {registerMutation.isPending
                  ? "Creating account..."
                  : "Create account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
