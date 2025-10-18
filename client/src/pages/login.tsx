import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Shield, Eye, EyeOff } from "lucide-react";
import { loginSchema } from "@shared/schema";
import type { LoginData } from "@shared/schema";
import wiconlogo from "@/assets/wicon-logo.png"
import attendeelylogo from "@/assets/icon.png"

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoggingIn, loginError, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    // defaultValues: {
    //   username: "username",
    //   password: "password",
    // },
  });

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);
  const onSubmit = (data: LoginData) => {
    login(data);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      {/* Responsive layout: column on small screens, two columns on md+ */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 w-full max-w-5xl">
        {/* Left: Logo */}
        <div className="flex items-center justify-center w-full md:w-1/2">
          <img className="w-50 h-50 md:w-100 md:h-100" src={attendeelylogo} alt="attendeely-logo" />
        </div>
        {/* Right: Login Card */}
        <Card className="w-full max-w-md md:w-1/2 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                {/* <Shield className="h-8 w-8 text-primary-foreground" /> */}
                <img src={wiconlogo} alt="" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                WiCon Ltd Admin Portal
              </h1>
              <p className="text-muted-foreground mt-2">
                Attendance System Dashboard
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter your username"
                          {...field}
                          data-testid="input-username"
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
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          {...field}
                          data-testid="input-password"
                          className="pr-12"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {loginError && (
                <div className="text-sm text-destructive text-center">
                  {loginError.message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoggingIn}
                data-testid="button-login"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
