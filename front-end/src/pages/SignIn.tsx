import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useLogin } from "@/hooks/useAuth";
import { useAuth } from "@/contexts/AuthContext";
import { signInSchema, type SignInFormData } from "@/schemas/forms";

const SignIn: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const loginMutation = useLogin();
  const location = useLocation();
  const navigate = useNavigate();

  // Get the page the user was trying to access
  const from = location.state?.from?.pathname || "/";

  // Initialize form with react-hook-form
  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle successful login redirect
  useEffect(() => {
    if (loginMutation.isSuccess && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [loginMutation.isSuccess, isAuthenticated, navigate, from]);

  const onSubmit = (data: SignInFormData) => {
    loginMutation.mutate({
      email: data.email,
      password: data.password,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-purple-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-blue-100">
            Or{" "}
            <Link
              to="/auth/sign-up"
              className="font-medium text-blue-300 hover:text-blue-200 transition-colors"
            >
              create a new account
            </Link>
          </p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-gray-900">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your RabbitMQ dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {loginMutation.isError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {(() => {
                        const error = loginMutation.error;
                        if (error instanceof Error) {
                          const message = error.message;
                          if (message.includes("Email not verified")) {
                            return (
                              <div>
                                <div className="font-medium mb-2">
                                  Email not verified
                                </div>
                                <p className="text-sm mb-3">
                                  Please verify your email address before
                                  logging in. Check your inbox for a
                                  verification email.
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate("/verify-email")}
                                  className="bg-white text-red-700 border-red-300 hover:bg-red-50"
                                >
                                  Go to verification page
                                </Button>
                              </div>
                            );
                          }
                          return message;
                        }
                        return "Failed to sign in. Please check your credentials.";
                      })()}
                    </AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          disabled={loginMutation.isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          disabled={loginMutation.isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending || !form.formState.isValid}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Legal Links */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <div className="flex justify-center gap-4 mt-2">
                <Link
                  to="/terms-of-service"
                  className="hover:text-primary transition-colors"
                >
                  Terms of Service
                </Link>
                <Link
                  to="/privacy-policy"
                  className="hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignIn;
