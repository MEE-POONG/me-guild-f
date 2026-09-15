import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";

const callbackContext = { params: { nextauth: ["callback", "google"] } };

export function GET(request: NextRequest) {
  return NextAuth(request, callbackContext, authOptions);
}

export function POST(request: NextRequest) {
  return NextAuth(request, callbackContext, authOptions);
}
