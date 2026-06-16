import { NextRequest, NextResponse } from "next/server";

async function handleMockRequest(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Get configuration from Search Params or Headers
    const statusParam = searchParams.get("status") || req.headers.get("x-mock-status") || "200";
    const delayParam = searchParams.get("delay") || req.headers.get("x-mock-delay") || "0";
    const contentType = searchParams.get("content-type") || req.headers.get("x-mock-content-type") || "application/json";

    const statusCode = parseInt(statusParam, 10) || 200;
    const delayMs = parseInt(delayParam, 10) || 0;

    // Simulate Network Latency Delay if requested
    if (delayMs > 0) {
      const clampedDelay = Math.min(delayMs, 5000); // Caps delay at 5 seconds for safety
      await new Promise((resolve) => setTimeout(resolve, clampedDelay));
    }

    // Get the request body if sent
    let requestPayload: any = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        requestPayload = await req.json();
      } catch {
        // Fallback for non-JSON or empty bodies
      }
    }

    // Determine return payload
    let responseBody: any = {
      success: statusCode >= 200 && statusCode < 300,
      mocked: true,
      statusCode,
      method: req.method,
      delayMs,
      payloadReceived: requestPayload,
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(req.headers.entries()),
    };

    // If x-response-body or response query is provided, use that instead
    const customResponseRaw = searchParams.get("response") || req.headers.get("x-mock-response");
    if (customResponseRaw) {
      try {
        responseBody = JSON.parse(customResponseRaw);
      } catch {
        responseBody = { text: customResponseRaw };
      }
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("x-mock-response-engine", "Helix Mock Engine");

    return new NextResponse(
      contentType.includes("application/json") ? JSON.stringify(responseBody) : String(responseBody),
      {
        status: statusCode,
        headers,
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed in mock router helper" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) { return handleMockRequest(req); }
export async function POST(req: NextRequest) { return handleMockRequest(req); }
export async function PUT(req: NextRequest) { return handleMockRequest(req); }
export async function DELETE(req: NextRequest) { return handleMockRequest(req); }
export async function PATCH(req: NextRequest) { return handleMockRequest(req); }
