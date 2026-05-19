import { NextRequest, NextResponse } from "next/server";
import { getAppStats, incrementAppStat, type StatEvent } from "@/lib/app-stats";

export const dynamic = "force-dynamic";

function isStatEvent(v: unknown): v is StatEvent {
  return v === "launch" || v === "completed";
}

export async function GET() {
  try {
    const stats = await getAppStats();
    return NextResponse.json(stats);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело" }, { status: 400 });
  }

  const event = (body as { event?: unknown })?.event;
  if (!isStatEvent(event)) {
    return NextResponse.json(
      { error: 'Укажите event: "launch" или "completed"' },
      { status: 400 },
    );
  }

  try {
    const stats = await incrementAppStat(event);
    return NextResponse.json(stats);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
