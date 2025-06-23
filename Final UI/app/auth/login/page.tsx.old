"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Logo imported but not directly used in the template. Kept for consistency.
import { Logo } from "@/components/logo";
import { ChromeIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { loginUser } from "@/lib/api"; // Import the API function
import { useAuth } from "@/context/AuthContext"; // Import useAuth hook
import { toast } from "sonner"; // Import toast

// Zod schema (remains the same)
const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }), // Min 1, actual length check by backend
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Removed apiError state

  const router = useRouter();
  const auth = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    }
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoading(true);
    // Removed setApiError(null);
    try {
      const response = await loginUser(data);
      // Assuming response is { token: string, user: User }
      if (response.token && response.user) {
        toast.success("Login successful! Redirecting..."); // Optional success toast
        auth.login(response.token, response.user);
        router.push('/feed');
      } else {
        throw new Error("Login response did not include token or user data.");
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      toast.error(error.data?.message || error.message || "An unexpected error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex w-full max-w-6xl mx-auto rounded-2xl shadow-xl overflow-hidden border">
        <div className="w-1/2 flex-col items-center justify-center bg-[#FFFCF6] p-12 hidden md:flex">
          <Image
            src="/imagex.png" // This image will be broken
            alt="Decorative Abstract Pattern"
            width={400}
            height={400}
            className="mb-10"
            priority
          />
          <h2 className="text-3xl font-black text-brand-text-dark text-left w-full mb-2" style={{fontFamily: 'Inter, sans-serif'}}>
              Where Connections Spark Opportunities
          </h2>
          <p className="text-lg text-brand-text-medium text-left w-full" style={{fontFamily: 'Inter, sans-serif'}}>
            Real roles. Real startups.
          </p>
        </div>
        <div className="w-full md:w-1/2 flex flex-col justify-center bg-white p-8 sm:p-12 min-h-full">
          <div className="mb-8 text-center">
            <span className="text-2xl font-black text-brand-text-dark" style={{fontFamily: 'Inter, sans-serif'}}>100</span>
            <span className="text-2xl font-black text-brand-blue ml-1" style={{fontFamily: 'Inter, sans-serif'}}>Networks</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-brand-text-dark mb-8 text-center" style={{fontFamily: 'Inter, sans-serif'}}>Login</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-sm font-semibold text-brand-text-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@gmail.com"
                {...register("email")}
                className="mt-1 bg-brand-bg-input border-brand-border placeholder-brand-text-light focus:border-brand-blue focus:ring-1 focus:ring-brand-blue py-3 px-3 text-base"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-semibold text-brand-text-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  {...register("password")}
                  className="mt-1 bg-brand-bg-input border-brand-border placeholder-brand-text-light focus:border-brand-blue focus:ring-1 focus:ring-brand-blue py-3 px-3 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-brand-text-medium hover:text-brand-blue"
                >
                  {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Removed direct rendering of apiError */}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black hover:bg-brand-text-dark text-white py-3 font-bold text-base rounded-lg mt-2 shadow-md"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-8 text-center">
            <span className="text-sm font-bold text-brand-text-dark">Don&apos;t have an account? </span>
            <Link href="/auth/signup" className="font-bold text-brand-blue underline ml-1 text-sm">Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
