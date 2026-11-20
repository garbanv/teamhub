import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "./errors";
import { getCurrentUser } from "./session";

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError("You need to sign in to do that.", 401, "unauthorized");
  }
  return user;
}

export function routeError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Invalid request.";
    return NextResponse.json(
      { error: message, code: "validation_error" },
      { status: 400 },
    );
  }

  console.error("[api]", error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again.", code: "internal_error" },
    { status: 500 },
  );
}

export function validationError(message: string) {
  return NextResponse.json(
    { error: message, code: "validation_error" },
    { status: 400 },
  );
}
