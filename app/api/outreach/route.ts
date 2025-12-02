import { NextResponse } from "next/server";

// Simple in-memory log for demo purposes
let logs: any[] = [];

export async function POST(request: Request) {
  const body = await request.json();

  // SIMULATION: No real email is sent.
  const newLog = {
    id: Math.random().toString(36).substr(2, 9),
    sentAt: new Date().toISOString(),
    ...body
  };

  logs.unshift(newLog); // Add to beginning

  return NextResponse.json({ success: true, log: newLog });
}